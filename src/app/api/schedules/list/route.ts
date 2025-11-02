import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username } = body ?? {};

    if (!email || !username) {
      return NextResponse.json({ error: "Email and username are required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        AND: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch schedules with quiz and attempts data
    const schedules = await prisma.schedule.findMany({
      where: { userId: user.id },
      include: {
        planItems: {
          include: { 
            subtopics: true,
            quiz: {
              include: {
                attempts: {
                  where: { userId: user.id }, // Only get current user's attempts
                  select: {
                    id: true,
                    completedAt: true,
                    score: true,
                    percentage: true
                  }
                }
              }
            }
          },
        },
      },
    });

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}