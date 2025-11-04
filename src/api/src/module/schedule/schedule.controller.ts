import express from "express";
import { ScheduleService } from "./schedule.service.js";
import { createScheduleSchema, formatZodValidationError, generateScheduleSchema, updateReminderSchema } from "./schema/schedule.schema.js";

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
      generate: async (req,res,next) => {
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
 * /api/v1/schedules/save:
 *   post:
 *     summary: Create a schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Get user schedules
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
      list: async(req,res,next) => {
          try {
      const userId = req.user?.userId; // From auth middleware
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const schedules = await scheduleService.getUserSchedules(userId);
      return res.json({ schedules });
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