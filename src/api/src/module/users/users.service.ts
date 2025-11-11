import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { GetUserHistorySchemaDto } from "./schema/users.schema.js";


export class UsersService {

    private prisma:PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

   async getUserHistory(userId: string,{status}: GetUserHistorySchemaDto) {
    
    //build you where clause
    let where:Prisma.QuizAttemptWhereInput = {userId};
      
     if (status === 'completed') {
      where.completedAt = { not: null };
    } else if (status === 'incomplete') {
      where.completedAt = null;
    }

     const attempts = await this.prisma.quizAttempt.findMany({
          where,
          include: {
            quiz: {
              include: {
                planItem: {
                  select: {
                    topic: true,
                    range: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

    
    // Separate completed and incomplete
    const completed = attempts.filter((a) => a.completedAt !== null);
    const incomplete = attempts.filter((a) => a.completedAt === null);

    // Calculate stats (only for completed quizzes)
    const stats = {
      totalAttempts: attempts.length,
      completedAttempts: completed.length,
      incompleteAttempts: incomplete.length,
      averageScore: completed.length > 0
        ? completed.reduce((sum, a) => sum + a.percentage, 0) / completed.length
        : 0,
      bestScore: completed.length > 0
        ? Math.max(...completed.map((a) => a.percentage))
        : 0,
      worstScore: completed.length > 0
        ? Math.min(...completed.map((a) => a.percentage))
        : 0,
      passRate: completed.length > 0
        ? (completed.filter((a) => a.percentage >= 70).length / completed.length) * 100
        : 0,
    };

     return {
        attempts,
        completed,
        incomplete,
        stats,
      }
   }


}