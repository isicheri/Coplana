import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, scheduleId } = body ?? ({} as {
      userId: string;
      scheduleId: string;
    });

    if (!userId || !scheduleId) {
      return NextResponse.json(
        { error: "userId and scheduleId are required" },
        { status: 400 }
      );
    }

    // ✅ Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Ensure schedule exists and belongs to this user
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    // 🚀 Prisma will automatically cascade delete related planItems + subtopics
    await prisma.schedule.delete({
      where: {
        id: scheduleId,
      },
    });

    return NextResponse.json(
      { message: "Schedule successfully deleted (cascade applied)" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
