import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const config = cleanEnv(process.env, {
  // Server
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: port({ default: 5000 }),
  API_URL: url({ default: 'http://localhost:5001' }),
  
  // Database
  DATABASE_URL: str(),
  
  // JWT
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: '7d' }),
  
  // Redis
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_PASSWORD: str(),
  
  // Frontend
  FRONTEND_URL: url({ default: 'http://localhost:3000' }),
  
  // AI
  MISTRAL_API_KEY: str(),

  //RESEND
  
});

export default config;