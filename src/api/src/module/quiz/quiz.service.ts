import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { createQuizSchemaDto, QuizAIResponseSchema, startQuizSchemaDto, submitQuizSchemaDto,UserAnswerData } from "./schema/quiz.schema.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";
import { studyPlannerAgent } from "../../mastra/agents/index.js";
import config from "../../config/index.js";



export class QuizService {

    private prisma: PrismaClient;
    constructor() {
        this.prisma = prisma
    }

   async startQuiz(userId: string,{quizId}: startQuizSchemaDto) {

        const existingAttempt = await this.prisma.quizAttempt.findFirst({
             where: {
               quizId,
               userId,
               completedAt: null // Only incomplete attempts
             },
             include: {
               quiz: {
                 include: {
                   questions: {
                     include: {
                       options: true,
                     },
                   },
                 },
               },
             },
           });
           
            // If user already has an incomplete attempt, return that instead
               if (existingAttempt) return existingAttempt;
           
               // Get quiz with questions
               const quiz = await prisma.quiz.findUnique({
                 where: { id: quizId },
                 include: {
                   questions: {
                     include: {
                       options: true,
                     },
                   },
                 },
               });
              
               if (!quiz) throw new HttpError('Quiz not found', 404, "",null);
               // Create NEW quiz attempt only if none exists
               const attempt = await this.prisma.quizAttempt.create({
                 data: {
                   quizId,
                   userId,
                   score: 0,
                   totalQuestions: quiz.questions.length,
                   percentage: 0,
                 },
                 include: {
                   quiz: {
                     include: {
                       questions: {
                         include: {
                           options: true,
                         },
                       },
                     },
                   },
                 },
               });

               return attempt;
    }

   async submitQuiz({quizId,attemptId,answers,timeTaken}: submitQuizSchemaDto) {
        if(config.NODE_ENV === "development") console.log(quizId);

        // Get attempt and quiz questions
        const attempt = await prisma.quizAttempt.findUnique({
          where: { id: attemptId },
          include: {
            quiz: {
              include: {
                questions: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        });
    
        if (!attempt) {
          throw new HttpError("Attempt not found",404,"not found error",null);
        }
    
        // Calculate score
        let correctCount = 0;
        const userAnswers: UserAnswerData[] = []; // ✅ Fixed type
    
        for (const answer of answers) {
          const question = attempt.quiz.questions.find(
            (q) => q.id === answer.questionId
          );
    
          if (!question) continue;
    
          // Find selected option
          const selectedOption = question.options.find(
            (opt) => opt.id === answer.selectedOptionId
          );
    
          // Check if correct
          const isCorrect = selectedOption?.label === question.correctAnswer;
          if (isCorrect) correctCount++;
    
          userAnswers.push({
            attemptId,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            isCorrect,
          });
        }
    
        const percentage = (correctCount / attempt.totalQuestions) * 100;
    
        // Update attempt and create user answers in transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create all user answers
      if (userAnswers.length > 0) {
  await tx.userAnswer.createMany({ data: userAnswers });
}
    
          // Update attempt with final score
          const updatedAttempt = await tx.quizAttempt.update({
            where: { id: attemptId },
            data: {
              score: correctCount,
              percentage,
              completedAt: new Date(),
              timeTaken,
            },
            include: {
              answers: {
                include: {
                  question: {
                    include: {
                      options: true,
                    },
                  },
                  selectedOption: true,
                },
              },
              quiz: {
                include: {
                  questions: {
                    include: {
                      options: true,
                    },
                  },
                },
              },
            },
          });
    
          return updatedAttempt;
        });

        return {
        attempt: result,
        score: correctCount,
        totalQuestions: attempt.totalQuestions,
        percentage,
        passed: percentage >= 70,
      };
  }  

  static  async createQuiz({planItemId}: createQuizSchemaDto) {
     // Get the plan item with subtopics
        const planItem = await prisma.planItem.findUnique({
          where: { id: planItemId },
          include: {
            subtopics: true,
            quiz: true // Check if quiz already exists
          }
        });
    
        if (!planItem) {
          throw new HttpError("Plan item not found",404,"Validation error",null);
        }
    
        // Check if all subtopics are completed
        const allCompleted = planItem.subtopics.every(st => st.completed);
        if (!allCompleted) {
          throw new  HttpError("Cannot generate quiz. Please complete all subtopics first.",400,"",null);
        }
    
        // If quiz already exists, delete it first (regeneration)
        if (planItem.quiz) {
          console.log("🗑️ Deleting existing quiz for regeneration...");
          await prisma.quiz.delete({
            where: { id: planItem.quiz.id }
          });
        }
    
        console.log("🎯 Generating quiz for:", planItem.topic);
    
        // Prepare data for agent
        const completedSubTopics = planItem.subtopics.map(st => st.title);
        const completedTopic = planItem.topic;
    
        // Call the agent to generate quiz
        const agentResponse = await studyPlannerAgent.generateVNext([
          {
            role: "user",
            content: `Call the "quiz-generator-tool" with this exact JSON input:
    {
      "completedTopic": "${completedTopic}",
      "completedSubTopics": ${JSON.stringify(completedSubTopics)}
    }
    
    Return ONLY the pure JSON output from the tool. Do not add text, markdown, or explanation. The final response must match this format:
    {
      "title": "string",
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "answer": "A"
        }
      ]
    }`
          }
        ]);
    
        // Parse the quiz result
        const quizData = JSON.parse(agentResponse.text);
    
        // Validate quiz data structure
        if (!quizData.title || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          throw new Error("Invalid quiz data structure from agent");
        }

        const validatedQuiz = QuizAIResponseSchema.parse(quizData);
    
        // Save quiz to database
     const generatedQuiz = await prisma.$transaction(async (tx) => {
  if (planItem.quiz) {
    console.log("🗑️ Deleting existing quiz for regeneration...");
    await tx.quiz.delete({ where: { id: planItem.quiz.id } });
  }

  return await tx.quiz.create({
    data: {
      planItemId: planItem.id,
      title: quizData.title,
      questions: {
        create: quizData.questions.map((q: any) => ({
          question: q.question,
          correctAnswer: q.answer,
          options: {
            create: q.options.map((opt: string, i: number) => ({
              label: String.fromCharCode(65 + i),
              content: opt,
            })),
          },
        })),
      },
    },
    include: {
      questions: { include: { options: true } },
    },
  });
});


    
        console.log("✅ Quiz generated successfully!");
        console.log("Quiz ID:", generatedQuiz.id);
        console.log("Questions:", generatedQuiz.questions.length);
    
        return {
          success: true,
          quiz: generatedQuiz,
          message: "Quiz generated successfully!"
        };
   }

}