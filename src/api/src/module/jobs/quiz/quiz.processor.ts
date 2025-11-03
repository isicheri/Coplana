import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../../../config/redis/redis.config.js';
import { QueueName } from '../../../lib/queue.js';
import { prisma } from '../../../lib/prisma.js';
interface QuizJobData {
  planItemId: string;
  topic: string;
  userId: string;
}

export const quizWorker = new Worker(
  QueueName.QUIZ_GENERATION,
  async (job: Job<QuizJobData>) => {
    const { planItemId, topic, userId } = job.data;

    try {
      await job.updateProgress(10);
      console.log(`🎯 Generating quiz for topic: ${topic}`);

      // TODO: Call Mastra AI agent to generate quiz questions
      await new Promise(resolve => setTimeout(resolve, 2000));
      await job.updateProgress(50);

      const quiz = await prisma.quiz.create({
        data: {
          title: `${topic} Quiz`,
          planItemId,
        },
      });

      await job.updateProgress(100);
      console.log(`✅ Quiz generated successfully: ${quiz.id}`);

      return { quizId: quiz.id, questionsCount: 0 };
    } catch (error) {
      console.error('❌ Quiz generation failed:', error);
      throw error;
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 2,
  }
);

quizWorker.on('completed', (job) => {
  console.log(`✅ Quiz job ${job.id} completed`);
});

quizWorker.on('failed', (job, err) => {
  console.error(`❌ Quiz job ${job?.id} failed:`, err);
});
