import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scheduleId, userId, toggleInput, startDate } = body ?? {};

    if (!userId || !scheduleId || toggleInput === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If enabling reminders, startDate is required
    if (toggleInput === true && !startDate) {
      return NextResponse.json({ error: "startDate is required when enabling reminders" }, { status: 400 });
    }

    // Find the user with all their schedules
    const findUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { schedules: true }
    });

    if (!findUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is trying to enable reminders
    if (toggleInput === true) {
      // Find any schedule that already has reminders enabled
      const enabledSchedule = findUser.schedules.find((s) => s.remindersEnabled === true);

      // If another schedule already has reminders enabled, turn it off first
      if (enabledSchedule && enabledSchedule.id !== scheduleId) {
        await prisma.schedule.update({
          where: { id: enabledSchedule.id },
          data: { remindersEnabled: false }
        });
      }
    }

    // Toggle the requested schedule on or off
    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { 
        remindersEnabled: toggleInput,
        startDate: toggleInput ? new Date(startDate) : null // Set startDate when enabling, clear when disabling
      }
    });

    return NextResponse.json({ 
      success: true,
      schedule: {
        id: schedule.id,
        remindersEnabled: schedule.remindersEnabled,
        startDate: schedule.startDate
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Toggle reminders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}