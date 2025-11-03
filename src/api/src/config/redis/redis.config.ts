import Redis from 'ioredis';
import config from '../index.js';

// Redis connection configuration
const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create Redis client for general use (caching, sessions)
export const redisClient = new Redis(redisConfig);

// Create separate Redis connection for BullMQ
export const bullmqConnection = new Redis(redisConfig);

// Event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

bullmqConnection.on('connect', () => {
  console.log('✅ BullMQ Redis connection established');
});

bullmqConnection.on('error', (err) => {
  console.error('❌ BullMQ Redis error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.quit();
  await bullmqConnection.quit();
  console.log('Redis connections closed');
});

export default redisClient;