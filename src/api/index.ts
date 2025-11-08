import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { slowDown } from "express-slow-down";
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import indexRouter from './src/routes.js';
import { startWorkers } from "./src/module/jobs/index.js";
import config from './src/config/index.js';
import HttpError from './src/config/handler/HttpError/HttpError.js';
import {swaggerSpec} from "./src/config/swagger/swagger.config.js"

dotenv.config();

const app = express();
const PORT = config.PORT || 5001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: [config.FRONTEND_URL, 'http://localhost:5000', 'http://localhost:5001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => hits * 100,
});

//rate limit route
app.use(limiter as unknown as express.RequestHandler);

// Health check (before API routes, no rate limit)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'study-planner-api',
    environment: config.NODE_ENV
  });
});

// Redis health check
app.get('/health/redis', async (req, res) => {
  try {
    const { redisClient } = await import('./src/config/redis/redis.config.js');
    await redisClient.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', redis: 'disconnected' });
  }
});


// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Study Planner Pro API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});



// Main router
app.use('/api/v1', indexRouter);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Express API is working!' });
});

// Error handling middleware
app.use((err: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  // Start BullMQ workers
  startWorkers();
});

export default app;