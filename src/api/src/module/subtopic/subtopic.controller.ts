import express from "express";
import { SubtopicService } from "./subtopic.service";
import {updateSubtopicSchema} from  "./schema/subtopic.schema.js"
import { formatZodValidationError } from "../auth/schema/auth.schema.js";

interface ISubtopicController {
  update: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => Promise<any>;
}

export const SubtopicController = (
  subtopicService: SubtopicService
): ISubtopicController => {
  return {
    /**
     * @swagger
     * /api/v1/subtopic/update:
     *   patch:
     *     summary: Update subtopic completion status and trigger quiz generation if all completed
     *     tags: [Subtopic]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - scheduleId
     *               - range
     *               - subIdx
     *               - completed
     *             properties:
     *               scheduleId:
     *                 type: string
     *                 format: uuid
     *               range:
     *                 type: string
     *                 example: "Week 1, Day 1: 9:00am - 11:30am"
     *               subIdx:
     *                 type: number
     *                 example: 0
     *               completed:
     *                 type: boolean
     *                 example: true
     *     responses:
     *       200:
     *         description: Subtopic updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     updated:
     *                       type: object
     *                     allCompleted:
     *                       type: boolean
     *                     quizGenerated:
     *                       type: boolean
     *                     quiz:
     *                       type: object
     *                       nullable: true
     *       400:
     *         description: Validation error
     *       500:
     *         description: Server error or quiz generation failed
     */
    update: async (req, res, next) => {
      try {
        // Validate request body
        const parsed = updateSubtopicSchema.safeParse(req.body);

        if (!parsed.success) {
          return res.status(400).json({
            success: false,
            error: "Validation failed",
            details: formatZodValidationError(parsed),
          });
        }

        // Call service
        const result = await subtopicService.update(parsed.data);

        // Success response
        return res.status(200).json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        // Handle specific error types
        if (error.errorType === "QUIZ_GENERATION_FAILED") {
          return res.status(500).json({
            success: false,
            error: error.message,
            errorType: error.errorType,
            rolledBack: error.rolledBack,
            details: error.details,
          });
        }

        if (error.errorType === "CRITICAL_FAILURE") {
          return res.status(500).json({
            success: false,
            error: error.message,
            errorType: error.errorType,
            details: error.details,
          });
        }

        // Generic error
        next(error);
      }
    },
  };
};