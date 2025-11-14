import { quizWorker } from "./quiz/quiz.processor.js";
import { reminderWorker } from "./reminder/reminder.processor.js";
import { analyticsWorker } from "./analytic/analytics.processor.js";
import { emailWorker } from "./emails/email.processor.js";
import { scheduleGenerationWorker } from './schedule/schedule-generation.worker.js';


export const startWorkers = () => {
  console.log('🚀 Starting BullMQ workers...');
  
  // Workers are already instantiated above
  // They will start processing jobs automatically
  
  console.log('✅ All workers started');
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏹️  Shutting down workers...');
  await Promise.all([
    quizWorker.close(),
    reminderWorker.close(),
    analyticsWorker.close(),
    emailWorker.close(),
    scheduleGenerationWorker.close()
  ]);
  console.log('✅ Workers closed');
});