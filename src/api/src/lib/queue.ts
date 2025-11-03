import { Queue, QueueOptions } from 'bullmq';
import { bullmqConnection } from '../config/redis/redis.config.js';

// Queue names
export enum QueueName {
  QUIZ_GENERATION = 'quiz-generation',
  REMINDERS = 'reminders',
  ANALYTICS = 'analytics',
  EMAIL = 'email',
}

// Default queue options
const defaultQueueOptions: QueueOptions = {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
};

// Create queues
export const quizGenerationQueue = new Queue(QueueName.QUIZ_GENERATION, {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2, // Quiz generation might fail due to AI
   // timeout: 120000, // 2 minutes timeout
  },
});

export const remindersQueue = new Queue(QueueName.REMINDERS, defaultQueueOptions);

export const analyticsQueue = new Queue(QueueName.ANALYTICS, defaultQueueOptions);

export const emailQueue = new Queue(QueueName.EMAIL, {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5, // Retry emails more
  },
});

// Queue Manager class for easy access in services
export class QueueManager {
  static async addQuizGenerationJob(data: {
    planItemId: string;
    topic: string;
    userId: string;
  }) {
    return await quizGenerationQueue.add('generate-quiz', data, {
      priority: 1, // High priority
    });
  }

  static async addReminderJob(
    data: {
      userId: string;
      scheduleId: string;
      message: string;
    },
    scheduledTime: Date
  ) {
    return await remindersQueue.add('send-reminder', data, {
      delay: scheduledTime.getTime() - Date.now(),
    });
  }

  static async addAnalyticsJob(data: { userId: string; type: string }) {
    return await analyticsQueue.add('calculate-analytics', data, {
      priority: 3, // Lower priority
    });
  }

  static async addEmailJob(data: {
    to: string;
    username: string;
    type: 'verification' | 'login_code' | 'welcome';
    data: {
      token?: string;
      code?: string;
    };
  }) {
    return await emailQueue.add('send-email', data, {
      attempts: 5, // Retry emails more
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  // Get job status
  static async getJobStatus(queueName: QueueName, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      // progress: await job.progress(),
      state: await job.getState(),
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  }

  private static getQueue(queueName: QueueName): Queue {
    switch (queueName) {
      case QueueName.QUIZ_GENERATION:
        return quizGenerationQueue;
      case QueueName.REMINDERS:
        return remindersQueue;
      case QueueName.ANALYTICS:
        return analyticsQueue;
      case QueueName.EMAIL:
        return emailQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}

export default QueueManager;