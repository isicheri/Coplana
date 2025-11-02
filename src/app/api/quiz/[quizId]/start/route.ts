// app/api/quiz/[quizId]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import z from "zod";

const startSchema = z.object({
  userId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const body = await req.json();
    const parsed = startSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;
    const { quizId } = await params;

    // 🔥 CHECK FOR EXISTING INCOMPLETE ATTEMPT FIRST
    const existingAttempt = await prisma.quizAttempt.findFirst({
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
    if (existingAttempt) {
      console.log("⚠️ Returning existing incomplete attempt");
      return NextResponse.json({ attempt: existingAttempt }, { status: 200 });
    }

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

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Create NEW quiz attempt only if none exists
    const attempt = await prisma.quizAttempt.create({
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

    console.log("✅ Created new quiz attempt:", attempt.id);
    return NextResponse.json({ attempt }, { status: 201 });
  } catch (err: any) {
    console.error("Quiz start error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}