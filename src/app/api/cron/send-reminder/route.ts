// app/api/cron/send-reminders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";

// Helper function to parse range: "Day 1: 10:00am - 1:00pm"
function parseRange(range: string): { dayNumber: number } | null {
  const match = range.match(/Day (\d+):/i);
  if (!match) {
    console.warn(`⚠️ Could not parse day number from range: "${range}"`);
    return null;
  }
  
  return {
    dayNumber: parseInt(match[1])
  };
}

// Helper function to convert "10:00am" to 24-hour format
function convertTo24Hour(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!match) {
    console.warn(`⚠️ Could not parse time: "${time}"`);
    return null;
  }
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toLowerCase();
  
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return { hours, minutes };
}

// Helper function to check if current time is within the plan item's time range
function isWithinTimeRange(range: string, currentDate: Date): boolean {
  // Parse "Day 1: 10:00am - 1:00pm" to get start and end times
  const match = range.match(/(\d{1,2}:\d{2}(?:am|pm))\s*-\s*(\d{1,2}:\d{2}(?:am|pm))/i);
  if (!match) {
    console.warn(`⚠️ Could not parse time range from: "${range}"`);
    return false;
  }
  
  const startTime = match[1].toLowerCase();
  const endTime = match[2].toLowerCase();
  
  const start = convertTo24Hour(startTime);
  const end = convertTo24Hour(endTime);
  
  if (!start || !end) return false;
  
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  const isWithin = currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes;
  
  console.log(`🕒 Time check for "${range}":`, {
    currentTime: `${currentHours}:${String(currentMinutes).padStart(2, '0')}`,
    startMinutes,
    endMinutes,
    currentTotalMinutes,
    isWithin
  });
  
  return isWithin;
}

// Helper function to check if we should send a reminder (every hour on the hour, within 15-min window)
function shouldSendReminderNow(currentDate: Date): boolean {
  const minutes = currentDate.getMinutes();
  // Send reminders at the top of each hour (within 0-15 minute window)
  const shouldSend = minutes >= 0 && minutes < 15;
  
  console.log(`⏰ Reminder timing check:`, {
    currentMinutes: minutes,
    shouldSend
  });
  
  return shouldSend;
}

export async function GET() {
  console.log('\n🚀 ===== CRON JOB STARTED =====');
  const now = new Date();
  console.log(`📅 Current time: ${now.toLocaleString()}`);
  
  try {
    // Find all schedules with reminders enabled
    const schedulesWithReminders = await prisma.schedule.findMany({
      where: {
        remindersEnabled: true,
        startDate: { not: null }
      },
      include: {
        user: true,
        planItems: {
          include: {
            subtopics: {
              orderBy: { createdAt: 'asc' } // Ensure consistent ordering
            }
          }
        }
      }
    });

    console.log(`📊 Found ${schedulesWithReminders.length} schedule(s) with reminders enabled`);

    if (schedulesWithReminders.length === 0) {
      console.log('ℹ️ No schedules with reminders enabled. Exiting.');
      return NextResponse.json({ 
        success: true,
        remindersSent: 0,
        message: 'No schedules with reminders enabled'
      }, { status: 200 });
    }

    const remindersToSend = [];

    for (const schedule of schedulesWithReminders) {
      console.log(`\n👤 Processing schedule for user: ${schedule.user.email}`);
      
      if (!schedule.startDate) {
        console.warn(`⚠️ Schedule ${schedule.id} has no startDate, skipping`);
        continue;
      }

      // Calculate which day we're on
      const startDate = new Date(schedule.startDate);
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDayNumber = daysSinceStart + 1; // Day 1, Day 2, etc.

      console.log(`📆 Schedule started: ${startDate.toLocaleDateString()}`);
      console.log(`📆 Days since start: ${daysSinceStart}`);
      console.log(`📆 Current day number: Day ${currentDayNumber}`);

      // Filter plan items for today
      const todaysPlanItems = schedule.planItems.filter(item => {
        const parsed = parseRange(item.range);
        const isToday = parsed && parsed.dayNumber === currentDayNumber;
        console.log(`   ${isToday ? '✅' : '❌'} Plan item: "${item.range}" (Day ${parsed?.dayNumber})`);
        return isToday;
      });

      console.log(`📝 Found ${todaysPlanItems.length} plan item(s) for Day ${currentDayNumber}`);

      if (todaysPlanItems.length === 0) {
        console.log(`ℹ️ No plan items scheduled for Day ${currentDayNumber}`);
        continue;
      }

      // Check each plan item
      for (const planItem of todaysPlanItems) {
        console.log(`\n🔍 Checking plan item: "${planItem.topic}" (${planItem.range})`);
        
        const parsed = parseRange(planItem.range);
        if (!parsed) continue;

        // Check if current time is within this plan item's time range
        const withinRange = isWithinTimeRange(planItem.range, now);
        const shouldSend = shouldSendReminderNow(now);
        
        console.log(`   Within time range: ${withinRange}`);
        console.log(`   Should send now: ${shouldSend}`);

        if (withinRange && shouldSend) {
          // Find the first incomplete subtopic
          const incompleteSubtopic = planItem.subtopics.find(s => !s.completed);
          
          if (incompleteSubtopic) {
            console.log(`✅ Found incomplete subtopic: "${incompleteSubtopic.title}"`);
            console.log(`📧 Queuing reminder for ${schedule.user.email}`);
            
            remindersToSend.push({
              username: schedule.user.username,
              email: schedule.user.email,
              currentSubTopic: incompleteSubtopic.title,
              scheduleTitle: schedule.title,
              topic: planItem.topic,
              range: planItem.range,
              scheduleId: schedule.id,
              planItemId: planItem.id
            });
          } else {
            console.log(`ℹ️ All subtopics completed for this plan item`);
          }
        } else {
          console.log(`⏭️ Skipping: not within time range or not time to send`);
        }
      }
    }

    console.log(`\n📬 Total reminders to send: ${remindersToSend.length}`);

    // Send all reminders
    const results = [];
    for (const reminder of remindersToSend) {
      console.log(`\n📤 Sending reminder to ${reminder.email}...`);
      console.log(`   Topic: ${reminder.topic}`);
      console.log(`   Subtopic: ${reminder.currentSubTopic}`);
      
      try {
        const result = await studyPlannerAgent.generateVNext([
          {
            role: "user",
            content: `Call the "study-reminder-tool" with this exact JSON input:
            {
              "username": "${reminder.username}",
              "email": "${reminder.email}",
              "currentSubTopic": "${reminder.currentSubTopic}"
            }

            Execute the tool call and return its result.`
          }
        ]);

        console.log(`✅ Reminder sent successfully to ${reminder.email}`);
        console.log(`   Agent response:`, result.text?.substring(0, 100) || 'No text response');
        
        results.push({ 
          success: true, 
          email: reminder.email,
          subtopic: reminder.currentSubTopic,
          topic: reminder.topic,
          range: reminder.range,
          agentResponse: result.text
        });
      } catch (error) {
        console.error(`❌ Failed to send reminder to ${reminder.email}:`, error);
        results.push({ 
          success: false, 
          email: reminder.email,
          subtopic: reminder.currentSubTopic,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log(`\n✅ ===== CRON JOB COMPLETED =====`);
    console.log(`📊 Summary: ${results.filter(r => r.success).length}/${results.length} reminders sent successfully`);

    return NextResponse.json({ 
      success: true,
      remindersSent: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
      timestamp: now.toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      timestamp: now.toISOString()
    }, { status: 500 });
  }
}