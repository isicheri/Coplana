import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { studyPlannerAgent } from "../../mastra/agents/index.js"; 
import { updateSubtopicSchemaDto } from "./schema/subtopic.schema.js";

export class SubtopicService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async update({ scheduleId, range, subIdx, completed }: updateSubtopicSchemaDto) {
    // First transaction: Update subtopic and check completion
    const result = await this.prisma.$transaction(async (tx) => {
      const planItem = await tx.planItem.findFirst({
        where: { scheduleId, range },
        include: {
          subtopics: true,
          quiz: true,
        },
      });

      if (!planItem) {
        throw new Error("PlanItem not found for the given range");
      }

      const subtopic = planItem.subtopics[subIdx];
      if (!subtopic) {
        throw new Error("Subtopic index out of range");
      }

      const updatedSubtopic = await tx.subtopic.update({
        where: { id: subtopic.id },
        data: { completed },
      });

      const allSubtopics = await tx.subtopic.findMany({
        where: { planItemId: planItem.id },
      });

      const allCompleted = allSubtopics.every((st) => st.completed);

      return {
        updatedSubtopic,
        planItem,
        allCompleted,
        hasQuiz: !!planItem.quiz,
        subtopicId: subtopic.id,
      };
    });

    // If all completed AND no quiz exists, attempt quiz generation
    let generatedQuiz = null;
    if (result.allCompleted && !result.hasQuiz) {
      console.log("🎯 All subtopics completed! Generating quiz...");

      try {
        const completedSubTopics = result.planItem.subtopics.map((st) => st.title);
        const completedTopic = result.planItem.topic;

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
}`,
          },
        ]);

        // Parse the quiz result
        const quizData = JSON.parse(agentResponse.text);

        // Save quiz to database
        generatedQuiz = await this.prisma.quiz.create({
          data: {
            planItemId: result.planItem.id,
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
            questions: {
              include: {
                options: true,
              },
            },
          },
        });

        console.log("✅ Quiz generated successfully!");
        console.log("GENERATED QUIZ: ", generatedQuiz);
      } catch (quizError: any) {
        console.error("❌ Quiz generation failed:", quizError);

        // 🔄 ROLLBACK: Unmark the last subtopic that triggered quiz generation
        console.log("⏪ Rolling back last subtopic completion...");

        try {
          await this.prisma.subtopic.update({
            where: { id: result.subtopicId },
            data: { completed: false },
          });

          console.log("✅ Rollback successful - user can retry");

          // Throw error with metadata so controller can handle it
          const error: any = new Error("Quiz generation failed due to network issues");
          error.statusCode = 500;
          error.errorType = "QUIZ_GENERATION_FAILED";
          error.rolledBack = true;
          error.details = quizError.message;
          throw error;
        } catch (rollbackError) {
          console.error("❌ Rollback also failed:", rollbackError);

          // Critical error - subtopic is stuck as completed but no quiz
          const error: any = new Error("Critical error: Quiz generation and rollback both failed");
          error.statusCode = 500;
          error.errorType = "CRITICAL_FAILURE";
          error.details = quizError.message;
          throw error;
        }
      }
    }

    return {
      updated: result.updatedSubtopic,
      allCompleted: result.allCompleted,
      quizGenerated: !!generatedQuiz,
      quiz: generatedQuiz,
    };
  }
}