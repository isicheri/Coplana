// app/api/quiz/attempts/[attemptId]/resume/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const { attemptId } = params;

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
        answers: true, // Get already answered questions
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.completedAt) {
      return NextResponse.json(
        { error: "Quiz already completed" },
        { status: 400 }
      );
    }

    // Get answered question IDs
    const answeredQuestionIds = attempt.answers.map((a) => a.questionId);

    return NextResponse.json(
      {
        attempt,
        answeredQuestionIds,
        remainingQuestions: attempt.totalQuestions - answeredQuestionIds.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Resume quiz error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
