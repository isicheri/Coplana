import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { startQuizSchemaDto, submitQuizSchemaDto,UserAnswerData } from "./schema/quiz.schema.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";
import config from "../../config/index.js";



export class QuizService {

    private prisma: PrismaClient;
    constructor() {
        this.prisma = prisma
    }

   async startQuiz({userId,quizId}: startQuizSchemaDto) {

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



}