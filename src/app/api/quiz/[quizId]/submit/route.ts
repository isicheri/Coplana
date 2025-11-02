// app/api/quiz/[quizId]/submit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import z from "zod";

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string().nullable(), // null if skipped
    })
  ),
  timeTaken: z.number().optional(), // seconds
});

// Define the type for user answers
type UserAnswerData = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
};

export async function POST(
  req: Request,
 { params }: { params: Promise<{ quizId: string }> } 
) {
  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { attemptId, answers, timeTaken } = parsed.data;
     const { quizId } = await params; 

     console.log(quizId)

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
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
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
      await tx.userAnswer.createMany({
        data: userAnswers,
      });

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

    return NextResponse.json(
      {
        attempt: result,
        score: correctCount,
        totalQuestions: attempt.totalQuestions,
        percentage,
        passed: percentage >= 70, // 70% passing grade
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Quiz submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
} 