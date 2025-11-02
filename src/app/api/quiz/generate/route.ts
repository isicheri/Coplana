import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";
import z from "zod";

const createQuizSchema = z.object({
  planItemId: z.string()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createQuizSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { planItemId } = parsed.data;

    // Get the plan item with subtopics
    const planItem = await prisma.planItem.findUnique({
      where: { id: planItemId },
      include: {
        subtopics: true,
        quiz: true // Check if quiz already exists
      }
    });

    if (!planItem) {
      return NextResponse.json(
        { error: "Plan item not found" },
        { status: 404 }
      );
    }

    // Check if all subtopics are completed
    const allCompleted = planItem.subtopics.every(st => st.completed);
    if (!allCompleted) {
      return NextResponse.json(
        { error: "Cannot generate quiz. Please complete all subtopics first." },
        { status: 400 }
      );
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

    // Save quiz to database
    const generatedQuiz = await prisma.quiz.create({
      data: {
        planItemId: planItem.id,
        title: quizData.title,
        questions: {
          create: quizData.questions.map((q: any) => ({
            question: q.question,
            correctAnswer: q.answer,
            options: {
              create: q.options.map((opt: string, i: number) => ({
                label: String.fromCharCode(65 + i), // A, B, C, D
                content: opt
              }))
            }
          }))
        }
      },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    console.log("✅ Quiz generated successfully!");
    console.log("Quiz ID:", generatedQuiz.id);
    console.log("Questions:", generatedQuiz.questions.length);

    return NextResponse.json({
      success: true,
      quiz: generatedQuiz,
      message: "Quiz generated successfully!"
    }, { status: 201 });

  } catch (err: any) {
    console.error("❌ Quiz generation error:", err);
    
    // Return user-friendly error messages
    if (err.message.includes("Connect Timeout")) {
      return NextResponse.json({
        error: "Network timeout while generating quiz. Please try again.",
        errorType: "TIMEOUT"
      }, { status: 500 });
    }

    if (err.message.includes("Invalid quiz data")) {
      return NextResponse.json({
        error: "Failed to generate valid quiz content. Please try again.",
        errorType: "INVALID_DATA"
      }, { status: 500 });
    }

    return NextResponse.json({
      error: err.message || "Failed to generate quiz. Please try again.",
      errorType: "UNKNOWN"
    }, { status: 500 });
  }
}