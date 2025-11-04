import express from "express";
import { ScheduleService } from "./schedule.service.js";
import { formatZodValidationError, generateScheduleSchema } from "./schema/schedule.schema.js";

interface IScheduleController {

    generate: (req: express.Request,res: express.Response,next: express.NextFunction) => Promise<any>;
    create: (req:express.Request,res:express.Request) => Promise<void>;
    getUserSchedule: (req:express.Request,res: express.Response) => Promise<void>

}

export const ScheduleController = (scheduleService: ScheduleService): IScheduleController =>  {
    
    return {


    /**
     * @swagger
     * /api/v1/schedules:
     * post: 
     *  tags: [Schedules]
     *  summary: Generate a study schedule 
     *  description: Generate AI-powered study plan for a topic
     * security: 
     *  - bearerAuth: []
      *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - topic
     *               - durationUnit
     *               - durationValue
     *          properties:
     *               topic:
     *                 type: string
     *                 example: Advanced Calculus
     *              durationUnit:
     *                 type: string
     *                 example: Days | Weeks | Months
     *              durationValue: 
     *                  type: integer
     *                  example: 4 
     *   responses:
 *       200:
 *         description: Schedule schedule generated  successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
     * 
     *  */
      generate: async (req,res,next) =>  {
         try {
      const parsed = generateScheduleSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: formatZodValidationError(parsed),
        });
      }

      const { topic, durationUnit, durationValue } = parsed.data;

      // Option 1: Generate synchronously (original behavior)
      const plan = await scheduleService.generateSchedule({topic,durationUnit,durationValue});

      return res.json({ plan });

      // Option 2: Queue it for background processing (recommended for long-running tasks)
      // const job = await scheduleGenerationQueue.add('generate', {
      //   topic,
      //   durationUnit,
      //   durationValue,
      //   userId: req.user?.id, // From auth middleware
      // });
      //
      // return res.status(202).json({
      //   message: 'Schedule generation started',
      //   jobId: job.id,
      // });
    } catch (error) {
      next(error);
    }
      },
        
      /**
 * @swagger
 * /api/v1/schedules:
 *   post:
 *     tags: [Schedules]
 *     summary: Create a new study schedule
 *     description: Generate AI-powered study plan for a topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - topic
 *               - timeframe
 *             properties:
 *               title:
 *                 type: string
 *                 example: JavaScript Mastery
 *               topic:
 *                 type: string
 *                 example: Advanced JavaScript Concepts
 *               timeframe:
 *                 type: object
 *                 required:
 *                   - value
 *                   - unit
 *                 properties:
 *                   value:
 *                     type: integer
 *                     example: 4
 *                   unit:
 *                     type: string
 *                     enum: [days, weeks, months]
 *                     example: weeks
 *               remindersEnabled:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scheduleId:
 *                   type: string
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
        async create(req, res) {},

        /**
 * @swagger
 * /api/v1/schedules:
 *   get:
 *     tags: [Schedules]
 *     summary: Get user's study schedules
 *     description: Retrieve all schedules for authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Schedules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
        async getUserSchedule(req, res) {},

    }
}