import { PrismaClient } from "@prisma/client";
import {prisma} from "../../lib/prisma.js"
import { CreateScheduleDto, GenerateScheduleDto, ScheduleListQuery } from "./schema/schedule.schema.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";
import { studyPlannerAgent } from "../../mastra/agents/index.js";



export class ScheduleService {

 private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }

 /**
   * Generate a study plan using AI
*/
static async generatePlan({topic,durationUnit,durationValue}:GenerateScheduleDto) {


    try {
   // 🧠 Use the agent to call the tool with the inputs
// let studyPlannerAgent = mastra.getAgentById("studyPlannerAgent")
    const result = await studyPlannerAgent.generateVNext([
      {
        role: "user",
        content: `Call the "study-planner-tool" with this exact JSON input:
        {
          "topic": "${topic}",
          "durationUnit": "${durationUnit}",
          "durationValue": ${durationValue}
        }

        Return ONLY the pure JSON output from the tool. Do not add text, markdown, or explanation. The final response must match this format:
        {
          "plan": [
            { "range": "string", "topic": "string", "subtopics": [{ "t": "string", "completed": false }] }
          ]
        }`
      },
    ]);

     // 🔹 Add this log
    console.log("raw agent output:", result.text);

    const raw = (result.text ?? "").trim();
     if (!raw) return new HttpError("Agent failed to generate plan",400,"Agent error",null);
    
    // Try to parse JSON out of the raw text
    const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
     if (!match) return new HttpError("Failed to parse Agent response",400,"parsing error",null);

      const parsed = JSON.parse(match[0]);
      // 🔹 Add this log
      console.log("parsed agent output:", parsed);
     return parsed.plan;
    }catch(error) {
    console.error('Plan generation error:', error);
    throw new HttpError("something went wrong with generating the plan!",400,"schedule error",null)
    }

}


/**
   * Create and save schedule to database
   */
  async createSchedule(data: CreateScheduleDto) {
    const { userId, title, plan } = data;

    return await prisma.$transaction(async (tx) => {
      // Create schedule
      const schedule = await tx.schedule.create({
        data: {
             title: title ?? `${plan[0]?.topic ?? "Study"} Plan`,
          userId,
        },
      });

      // Create plan items and subtopics
      for (const item of plan) {
        const planItem = await tx.planItem.create({
          data: {
            scheduleId: schedule.id,
            range: item.range,
            topic: item.topic,
          },
        });

        // Create subtopics
        for (const sub of item.subtopics) {
          await tx.subtopic.create({
            data: {
              planItemId: planItem.id,
              title: sub.t,
              completed: sub.completed || false,
            },
          });
        }
      }
      return schedule;
    });
  }


  /**
   * Get all schedules for a user
   */
  async getUserSchedules(userId: string,{page,limit}: ScheduleListQuery) {
    const skip = (page - 1) * limit;
    const [schedules,total] = await Promise.all([
    this.prisma.schedule.findMany({
      where: { userId },
      include: {
        planItems: {
          include: {
            subtopics: true,
            quiz: {
              include: {
                attempts: {
                  where: { userId },
                  select: {
                    id: true,
                    completedAt: true,
                    score: true,
                    percentage: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    this.prisma.schedule.count({where: { userId }})
    ])
    return { schedules, total, page, limit };
  }

   /**
   * Delete a schedule
   */
  async deleteSchedule(userId: string, scheduleId: string) {
    // Verify ownership
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) {
      throw new Error('Schedule not found or unauthorized');
    }

    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return { success: true };
  }


  /**
   * Toggle reminders for a user schedule
   */
  async toggleReminders(
    scheduleId: string,
    userId: string,
    enable: boolean,
    startDate: string | null
  ) {
    // Verify ownership
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) {
      throw new Error('Schedule not found or unauthorized');
    }

     // Find the user with all their schedules
        const findUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { schedules: true }
        });
    
        if (!findUser) {
          return new HttpError("User not found",400,"not found error",null)
        }


        
            // Check if user is trying to enable reminders
            if (enable === true) {
              // Find any schedule that already has reminders enabled
              const enabledSchedule = findUser.schedules.find((s) => s.remindersEnabled === true);
        
              // If another schedule already has reminders enabled, turn it off first
              if (enabledSchedule && enabledSchedule.id !== scheduleId) {
             return  await prisma.schedule.update({
                  where: { id: enabledSchedule.id },
                  data: { remindersEnabled: false }
                });
              }
            }
        
    return await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        remindersEnabled: enable,
        startDate: enable ? startDate : null,
      },
    });
  }



}