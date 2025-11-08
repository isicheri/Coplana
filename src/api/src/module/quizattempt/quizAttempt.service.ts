import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";



export class QuizAttemtService {

    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    async getQuizAttempt(attemptId: string) {
  const attempt = await this.prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
      answers: {
        include: {
          question: { include: { options: true } },
          selectedOption: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new HttpError("Attempt not found", 404, "NotFoundError", null);
  }

  return attempt;
}


  async resumeQuizAttempt(attemptId: string) {
  const attempt = await this.prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    throw new HttpError("Attempt not found", 404, "NotFoundError", null);
  }

  if (attempt.completedAt) {
    throw new HttpError("Quiz already completed", 400, "BadRequestError", null);
  }

  const answeredQuestionIds = attempt.answers.map(a => a.questionId);

  return {
    quizAttempt: attempt,
    progress: {
      answered: answeredQuestionIds.length,
      total: attempt.totalQuestions,
      remaining: attempt.totalQuestions - answeredQuestionIds.length,
    },
  };
}

}