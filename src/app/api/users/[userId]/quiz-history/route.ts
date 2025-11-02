// app/api/users/[userId]/quiz-history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'completed', 'incomplete', or null for all

    // Build where clause
    const where: any = { userId };
    
    if (status === 'completed') {
      where.completedAt = { not: null };
    } else if (status === 'incomplete') {
      where.completedAt = null;
    }

    const attempts = await prisma.quizAttempt.findMany({
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

    return NextResponse.json(
      {
        attempts,
        completed,
        incomplete,
        stats,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Get quiz history error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}