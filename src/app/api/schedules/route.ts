import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import z from "zod";

const saveSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  plan: z.array(
    z.object({
      range: z.string(),
      topic: z.string(),
      subtopics: z.array(z.object({ t: z.string(), completed: z.boolean() }))
    })
  )
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.errors }, { status: 400 });
    }

    const { userId, title, plan } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      // 1️⃣ Create Schedule
      const schedule = await tx.schedule.create({
        data: {
          title: title ?? `${plan[0]?.topic ?? "Study"} Plan`,
          userId,
        },
      });

      // 2️⃣ Create PlanItems and Subtopics
      for (const item of plan) {
        const planItem = await tx.planItem.create({
          data: {
            scheduleId: schedule.id,
            range: item.range,
            topic: item.topic,
          },
        });

        for (const sub of item.subtopics) {
          await tx.subtopic.create({
            data: {
              planItemId: planItem.id,
              title: sub.t,
              completed: sub.completed,
            },
          });
        }
      }

      return schedule;
    });

    return NextResponse.json({ schedule: created }, { status: 201 });
  } catch (err: any) {
    console.error("save schedule error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
