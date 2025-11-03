import { Worker as ReminderWorker, Job as ReminderJob } from 'bullmq';
import { bullmqConnection } from '../../../config/redis/redis.config.js';
import { QueueName } from '../../../lib/queue.js';
import { prisma } from '../../../lib/prisma.js';


interface ReminderJobData {
  userId: string;
  scheduleId: string;
  message: string;
}

export const reminderWorker = new ReminderWorker(
  QueueName.REMINDERS,
  async (job: ReminderJob<ReminderJobData>) => {
    const { userId, scheduleId, message } = job.data;

    try {
      console.log(`📧 Sending reminder to user ${userId}`);

      // TODO: Send email/push notification
      // await sendEmail({ to: user.email, subject: 'Study Reminder', body: message });

      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {},
      });

      return { sent: true, timestamp: new Date() };
    } catch (error) {
      console.error('❌ Reminder failed:', error);
      throw error;
    }
  },
  { connection: bullmqConnection }
);

reminderWorker.on('completed', (job) => {
  console.log(`✅ Reminder job ${job.id} completed`);
});

reminderWorker.on('failed', (job, err) => {
  console.error(`❌ Reminder job ${job?.id} failed:`, err);
});
