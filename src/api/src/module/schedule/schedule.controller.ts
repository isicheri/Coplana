import express from "express";
import { ScheduleService } from "./schedule.service.js";
import { createScheduleSchema, formatZodValidationError, generateScheduleSchema, ScheduleListQuerySchema, updateReminderSchema } from "./schema/schedule.schema.js";
import { v4 as uuidv4 } from 'uuid';
import { scheduleGenerationQueue } from "../../lib/queue.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";

interface IScheduleController {
    generate: (req: express.Request,res: express.Response,next: express.NextFunction) => Promise<any>;
    save: (req:express.Request,res:express.Response,next:express.NextFunction) => Promise<any>;
    list: (req:express.Request,res: express.Response,next:express.NextFunction) => Promise<any>,
    delete: (req: express.Request,res:express.Response,next:express.NextFunction) => Promise<any>
    updateReminders: (req: express.Request,res: express.Response,next: express.NextFunction) => Promise<any>
}

export const ScheduleController = (scheduleService: ScheduleService): IScheduleController =>  {
  
    return {


/**
 * @swagger
 * /api/v1/schedules/generate:
 *   post:
 *     summary: Generate a study plan
 *     tags: [Schedules]
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
 *             properties:
 *               topic:
 *                 type: string
 *               durationUnit:
 *                 type: string
 *                 enum: [days, weeks, months]
 *               durationValue:
 *                 type: number
 *     responses:
 *       200:
 *         description: Study plan generated
 */
      async generate(req,res,next) {
    try {
      const parsed = generateScheduleSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: formatZodValidationError(parsed),
        });
      }

      const { topic, durationUnit, durationValue } = parsed.data;
      const requestId = uuidv4(); // Unique ID for tracking

      // Add job to queue
      const job = await scheduleGenerationQueue.add('generate-schedule', {
        topic,
        durationUnit,
        durationValue,
        userId: req.user?.userId, // Optional: if user is authenticated
        requestId,
      });

      return res.status(202).json({
        message: 'Schedule generation started',
        jobId: job.id,
        requestId,
        statusUrl: `/api/v1/schedules/generation/status/${job.id}`,
      });
    } catch (error) {
      next(error);
    }
  },

/**
 * @swagger
 * /api/v1/schedules/save:
 *   post:
 *     summary: Create and save a user schedule
 *     description: Creates a study schedule for a specific user with plan items and subtopics.
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - plan
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: "c1d3a470-6b2f-4a93-b74b-f3229cbd091a"
 *               title:
 *                 type: string
 *                 example: "Week 1 Study Plan"
 *               plan:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - range
 *                     - topic
 *                     - subtopics
 *                   properties:
 *                     range:
 *                       type: string
 *                       example: "Day 1-3"
 *                     topic:
 *                       type: string
 *                       example: "Introduction to Biology"
 *                     subtopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - t
 *                         properties:
 *                           t:
 *                             type: string
 *                             example: "Cell structure"
 *                           completed:
 *                             type: boolean
 *                             default: false
 *                             example: false
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedule:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "7a5d2b4e-8a6e-4a33-b89f-0c5b51a8d413"
 *                     title:
 *                       type: string
 *                       example: "Week 1 Study Plan"
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                       example: "c1d3a470-6b2f-4a93-b74b-f3229cbd091a"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-06T10:45:22.000Z"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: object
 *                   example:
 *                     field: "title"
 *                     message: "Title is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
      save: async (req, res,next) => {
             try {
      const parsed = createScheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: formatZodValidationError(parsed),
        });
      }
      const schedule = await scheduleService.createSchedule(parsed.data);
      return res.status(201).json({ schedule });
    } catch (error) {
      next(error);
    }
        },


/**
 * @swagger
 * /api/v1/schedules/personal:
 *   get:
 *     summary: Get user schedules (paginated)
 *     description: Retrieve the authenticated user's schedules with pagination support.
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of schedules per page
 *     responses:
 *       200:
 *         description: User schedules fetched successfully
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
 *                         example: "c1d3a470-6b2f-4a93-b74b-f3229cbd091a"
 *                       title:
 *                         type: string
 *                         example: "My Study Plan"
 *                       createdAt:
 *                         type: string
 *                         example: "2025-11-11T14:22:30.000Z"
 *                       updatedAt:
 *                         type: string
 *                         example: "2025-11-12T14:22:30.000Z"
 *                       planItems:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "7a5d2b4e-8a6e-4a33-b89f-0c5b51a8d413"
 *                             range:
 *                               type: string
 *                               example: "Week 1"
 *                             topic:
 *                               type: string
 *                               example: "Biology"
 *                             subtopics:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     example: "3e5d2a3b-7a1e-4b5f-b2a4-f1234c5a8b23"
 *                                   title:
 *                                     type: string
 *                                     example: "Photosynthesis"
 *                                   completed:
 *                                     type: boolean
 *                                     example: false
 *                             quiz:
 *                               type: object
 *                               properties:
 *                                 attempts:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                         example: "8f5d2a3b-7a1e-4b5f-b2a4-f1234c5a8b24"
 *                                       completedAt:
 *                                         type: string
 *                                         nullable: true
 *                                         example: "2025-11-11T15:22:30.000Z"
 *                                       score:
 *                                         type: number
 *                                         example: 90
 *                                       percentage:
 *                                         type: number
 *                                         example: 90
 *                 total:
 *                   type: integer
 *                   example: 25
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: object
 *       401:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

      list: async(req,res,next) => {
          try {
      const userId = req.user?.userId;
      if (!userId) return new HttpError("unauthorized",401,"unauthorize error",null);
      const parsed = await ScheduleListQuerySchema.safeParseAsync(req.query);

       if (!parsed.success) {
        if (process.env.NODE_ENV === 'development') console.error(parsed.error);
  return res.status(400).json({
    error: 'Validation failed',
    details: formatZodValidationError(parsed),
  });
                            }

       const { page, limit } = parsed.data;

      const data = await scheduleService.getUserSchedules(userId, { page, limit });
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
        },


        /**
 * @swagger
 * /api/v1/schedules/{scheduleId}:
 *   delete:
 *     summary: Delete a schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
       delete: async (req, res, next) =>  {
    try {
      const { scheduleId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await scheduleService.deleteSchedule(userId, scheduleId);

      return res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      next(error);
    }
        },


        /**
 * @swagger
 * /api/v1/schedules/{scheduleId}/reminders:
 *   patch:
 *     summary: Toggle reminders
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
        updateReminders: async(req, res, next) =>  {
    try {
      const { scheduleId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = updateReminderSchema.safeParse({
        ...req.body,
        scheduleId,
        userId,
      });

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.errors,
        });
      }

      const { toggleInput, startDate } = parsed.data;

      const updated = await scheduleService.toggleReminders(
        scheduleId,
        userId,
        toggleInput,
        startDate
      );

      return res.json({ schedule: updated });
    } catch (error) {
      next(error);
    }
      }
  }
}