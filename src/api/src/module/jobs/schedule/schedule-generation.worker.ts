import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../../../config/redis/redis.config.js';
import { ScheduleService } from '../../schedule/schedule.service.js';
import { ScheduleGenerationJobData } from '../../../lib/queue.js';

// Worker to process schedule generation jobs
export const scheduleGenerationWorker = new Worker<ScheduleGenerationJobData>(
  'schedule-generation',
  async (job: Job<ScheduleGenerationJobData>) => {
    const { topic, durationUnit, durationValue, requestId } = job.data;

    console.log(`🔄 Processing schedule generation job ${job.id} for: ${topic}`);
    
    // Update progress
    await job.updateProgress(10);

    try {
      // Call your AI service to generate the plan
      await job.updateProgress(30);
      
      const plan = await ScheduleService.generatePlan({
        topic,
        durationUnit,
        durationValue
      });

      await job.updateProgress(80);

      // Store result in job data so it can be retrieved
      const result = {
        requestId,
        plan,
        topic,
        generatedAt: new Date().toISOString(),
      };

      await job.updateProgress(100);
      
      console.log(`✅ Schedule generation completed for job ${job.id}`);
      
      return result;
    } catch (error: any) {
      console.error(`❌ Schedule generation failed for job ${job.id}:`, error);
      throw error; // This will trigger retry logic
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 2, // Process 2 jobs at a time
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // per minute
    },
  }
);

// Event listeners
scheduleGenerationWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

scheduleGenerationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

scheduleGenerationWorker.on('progress', (job, progress) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

console.log('✅ Schedule generation worker started');

export default scheduleGenerationWorker;