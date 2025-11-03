import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';
import config from '../index.js';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Study Planner Pro API',
    version: '1.0.0',
    description: 'AI-powered study planning and progress tracking API',
    contact: {
      name: 'API Support',
      email: 'support@studyplanner.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development server',
    },
    {
      url: config.API_URL,
      description: 'Development server',
    },
    {
      url: 'https://api.studyplanner.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Unauthorized',
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Input validation failed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'input validation error',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Internal server error',
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication endpoints',
    },
    {
      name: 'Schedules',
      description: 'Study schedule management',
    },
    {
      name: 'Quizzes',
      description: 'Quiz generation and attempts',
    },
    {
      name: 'Analytics',
      description: 'User progress and analytics',
    },
    {
      name: 'Jobs',
      description: 'Background job status',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/module/*/*.route.ts',
    './src/module/*/*.controller.ts',
    './dist/api/src/module/*/*.route.js',
    './dist/api/src/module/*/*.controller.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;