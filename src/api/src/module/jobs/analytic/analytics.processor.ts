import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../../../config/redis/redis.config.js';
import { QueueName } from '../../../lib/queue.js';
import { prisma } from '../../../lib/prisma.js';
interface AnalyticsJobData {
  userId: string;
  type: string;
}

export const analyticsWorker = new Worker(
  QueueName.ANALYTICS,
  async (job: Job<AnalyticsJobData>) => {
    const { userId, type } = job.data;

    try {
      console.log(`📊 Calculating analytics for user ${userId}`);

      const stats = await prisma.quizAttempt.aggregate({
        where: { userId },
        _avg: { score: true, percentage: true },
        _count: true,
      });

      return { stats, calculatedAt: new Date() };
    } catch (error) {
      console.error('❌ Analytics calculation failed:', error);
      throw error;
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 5,
  }
);

analyticsWorker.on('completed', (job) => {
  console.log(`✅ Analytics job ${job.id} completed`);
});

analyticsWorker.on('failed', (job, err) => {
  console.error(`❌ Analytics job ${job?.id} failed:`, err);
});
