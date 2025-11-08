import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../../../config/redis/redis.config.js';
import { QueueName } from '../../../lib/queue.js';
import { QuizService } from '../../quiz/quiz.service.js';
import HttpError from '../../../config/handler/HttpError/HttpError.js';

interface QuizJobData {
  planItemId: string;
  userId: string,
  requestId: string
}

export const quizWorker = new Worker<QuizJobData>(
  QueueName.QUIZ_GENERATION,
  async (job: Job<QuizJobData>) => {
    const { planItemId,requestId,userId } = job.data;
    try {
    
      if(!userId) {
        throw new HttpError("User not found",401,"Authorization error",null);
      }

      console.log(`🎯 Starting quiz generation for planItemId: ${planItemId}`);
      await job.updateProgress(10);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await job.updateProgress(50);

      // ✅ Create quiz from AI or predefined template
      const quiz = await QuizService.createQuiz({ planItemId });
      await job.updateProgress(100);

        const result = {
        requestId,
        quiz,
        userId,
        generatedAt: new Date().toISOString(),
      };

      console.log(`✅ Quiz successfully generated for ${planItemId}`);
      return result;
    } catch (error) {
      console.error(`❌ Quiz generation failed for ${planItemId}:`, error);
      // Propagate the error so BullMQ logs the job as failed
      throw error;
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 2,
  }
);

// ✅ Event listeners
quizWorker.on('completed', (job) => {
  console.log(`✅ Quiz job ${job.id} completed`);
});

quizWorker.on('failed', (job, err) => {
  console.error(`❌ Quiz job ${job?.id} failed:`, err);
});
