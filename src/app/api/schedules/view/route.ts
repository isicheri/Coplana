import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username,scheduleId } = body ?? {};

    if (!email || !username || !scheduleId) {
      return NextResponse.json({ error: "all fields are required" }, { status: 400 });
    }

    // Find user by both email and username to ensure they match
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

    // Fetch all schedules for this user
  const schedule = await prisma.schedule.findFirst({
  where: { userId: user.id,id: scheduleId },
  include: {
    planItems: {
      include: { subtopics: true },
    },
  },
});

    return NextResponse.json({ schedule }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
