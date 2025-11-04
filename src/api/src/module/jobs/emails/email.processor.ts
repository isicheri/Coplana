import { Worker, Job  } from 'bullmq';
import { bullmqConnection } from '../../../config/redis/redis.config.js';
import { QueueName } from '../../../lib/queue.js';
import EmailService from '../../../lib/service/email.service.js';


interface EmailJobData {
  to: string;
  username: string;
  type: 'verification' | 'login_code' | 'welcome';
  data: {
    token?: string;
    code?: string;
  };
}

export const emailWorker = new Worker(
  QueueName.EMAIL,
  async (job: Job<EmailJobData>) => {
    const { to, username, type, data } = job.data;

    try {
      console.log(`📧 Sending ${type} email to ${to}`);

      let result;

      switch (type) {
        case 'verification':
          if (!data.token) throw new Error('Token is required for verification email');
          result = await EmailService.sendVerificationEmail(to, username, data.token);
          break;

        case 'login_code':
          if (!data.code) throw new Error('Code is required for login code email');
          result = await EmailService.sendLoginCode(to, data.code, username);
          break;

        case 'welcome':
          result = await EmailService.sendWelcomeEmail(to, username);
          break;

        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      return { sent: true, to, type, timestamp: new Date(), messageId: result?.id };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  },
  { connection: bullmqConnection }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job?.id} failed:`, err);
});
