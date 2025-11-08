import express from "express";
import { QuizService } from "./quiz.service.js";
import { createQuizSchema, startQuizSchema,submitQuizSchema } from "./schema/quiz.schema.js";
import { formatZodValidationError } from "../auth/schema/auth.schema.js";
import { QuizAttemtService } from "../quizattempt/quizAttempt.service.js";
import { emailQueue } from "../../lib/queue.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";
import {v4 as uuidv4} from "uuid";

interface IQuizController {
    start: (req:express.Request,res: express.Response,next: express.NextFunction) => Promise<any>,
    submit: (req:express.Request,res: express.Response,next: express.NextFunction) => Promise<any>,
    getQuizAttempt: (req:express.Request,res: express.Response,next: express.NextFunction) => Promise<any>,
    resumeQuiz: (req:express.Request,res:express.Response,next: express.NextFunction) => Promise<any>,
    generateQuiz: (req:express.Request,res: express.Response, next: express.NextFunction) => Promise<any>
}

export const quizController = (quizService: QuizService,quizAttemtService: QuizAttemtService):IQuizController => {

    return {

       /**
 * @swagger
 * /api/v1/quiz/{quizId}/start:
 *   post:
 *     summary: Start a quiz or continue an existing attempt
 *     description: Creates a new quiz attempt for the authenticated user, or returns an ongoing (incomplete) attempt if one exists.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the quiz to start.
 *     responses:
 *       200:
 *         description: Successfully started or retrieved an existing quiz attempt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The unique ID of the quiz attempt.
 *                 quizId:
 *                   type: string
 *                   description: The associated quiz ID.
 *                 userId:
 *                   type: string
 *                   description: The user who started the quiz.
 *                 score:
 *                   type: number
 *                   description: Current score of the user in this attempt.
 *                 totalQuestions:
 *                   type: integer
 *                   description: Total number of questions in the quiz.
 *                 percentage:
 *                   type: number
 *                   description: Current completion percentage.
 *                 quiz:
 *                   type: object
 *                   description: The quiz details including questions and options.
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           text:
 *                             type: string
 *                           options:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 text:
 *                                   type: string
 *                                 isCorrect:
 *                                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
        start: async(req,res,next) => {
           try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = await startQuizSchema.safeParseAsync(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodValidationError(parsed),
      });
    }

    const { quizId } = parsed.data;
    const attempt = await quizService.startQuiz({ userId, quizId });

    return res.status(200).json(attempt);
  } catch (error) {
    next(error);
  }
        },

        /**
 * @swagger
 * /api/v1/quiz/{quizId}/submit:
 *   post:
 *     summary: Submit a completed quiz attempt
 *     description: Submits the user's answers for a quiz attempt and calculates score, percentage, and pass/fail status.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the quiz to submit.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attemptId:
 *                 type: string
 *                 description: The unique ID of the quiz attempt.
 *               answers:
 *                 type: array
 *                 description: Array of answers submitted by the user.
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     selectedOptionId:
 *                       type: string
 *               timeTaken:
 *                 type: number
 *                 description: Time taken by the user to complete the quiz (in seconds).
 *     responses:
 *       200:
 *         description: Successfully submitted quiz results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attemptId:
 *                   type: string
 *                 score:
 *                   type: integer
 *                 totalQuestions:
 *                   type: integer
 *                 percentage:
 *                   type: number
 *                 passed:
 *                   type: boolean
 *                 timeTaken:
 *                   type: number
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 quiz:
 *                   type: object
 *                   description: Quiz details with questions and options.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
        submit: async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const quizId = req.params.quizId;
    const parsed = await submitQuizSchema.safeParseAsync(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: formatZodValidationError(parsed),
      });
    }

    const { attemptId, answers, timeTaken } = parsed.data;
    const result = await quizService.submitQuiz({ quizId, attemptId, answers, timeTaken });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
        },
        
        /**
 * @swagger
 * /api/v1/quiz/attempts/{attemptId}:
 *   get:
 *     summary: Get full details of a quiz attempt
 *     description: Retrieves a quiz attempt, including quiz data, questions, user info, and selected answers.
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the quiz attempt.
 *     responses:
 *       200:
 *         description: Successfully retrieved quiz attempt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                 quiz:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           text:
 *                             type: string
 *                           options:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 label:
 *                                   type: string
 *       404:
 *         description: Attempt not found.
 *       500:
 *         description: Server error.
 */
        getQuizAttempt: async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;
    if (!attemptId) {
      throw new HttpError("Missing attemptId", 400, "ValidationError", null);
    }

    const data = await quizAttemtService.getQuizAttempt(attemptId);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
        },

        /**
 * @swagger
 * /api/v1/quiz/attempts/{attemptId}/resume:
 *   post:
 *     summary: Resume an ongoing quiz attempt
 *     description: Returns the current progress of a quiz attempt, including how many questions were answered and how many remain.
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the quiz attempt to resume.
 *     responses:
 *       200:
 *         description: Quiz attempt resumed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quizAttempt:
 *                   type: object
 *                   description: The ongoing quiz attempt with questions and existing answers.
 *                 progress:
 *                   type: object
 *                   properties:
 *                     answered:
 *                       type: integer
 *                       description: Number of answered questions.
 *                     total:
 *                       type: integer
 *                       description: Total number of questions.
 *                     remaining:
 *                       type: integer
 *                       description: Number of unanswered questions remaining.
 *       400:
 *         description: Quiz already completed or invalid request.
 *       404:
 *         description: Attempt not found.
 *       500:
 *         description: Server error.
 */
        resumeQuiz: async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    if (!attemptId) {
      throw new HttpError("Missing attemptId", 400, "ValidationError", null);
    }

    const data = await quizAttemtService.resumeQuizAttempt(attemptId);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
        },
 

        /**
 * @swagger
 * /api/v1/quiz/generate:
 *   post:
 *  
 *     summary: Start quiz generation for a given plan item
 *     description: |
 *       Validates the request body and enqueues a quiz generation job using BullMQ.
 *       The quiz will be generated asynchronously by the background worker (`quizWorker`).
 *       Returns a 202 Accepted response with a job ID and tracking request ID.
 *
 *     tags: [Quizzes]
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planItemId:
 *                 type: string
 *                 example: "clz9p0l0a0000tkj0h2xtv49z"
 *
 *     responses:
 *       202:
 *         description: Quiz generation job successfully queued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "quiz generation started"
 *                 jobId:
 *                   type: string
 *                   example: "bullmq-job-12345"
 *                 requestId:
 *                   type: string
 *                   example: "2b9c5e2b-1e2a-47c8-aef7-73d69e63b8a4"
 *                 statusUrl:
 *                   type: string
 *                   example: "/api/v1/quiz/status/2b9c5e2b-1e2a-47c8-aef7-73d69e63b8a4"
 *
 *       400:
 *         description: Validation failed.
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
 *                     planItemId: "Required field"
 *
 *       401:
 *         description: Unauthorized - Missing or invalid JWT.
 *       500:
 *         description: Internal server error or queue failure.
 *
 * @function generateQuiz
 * @memberof QuizController
 * @param {Request} req - Express request object (must include `planItemId` in body and authenticated user).
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Returns a JSON response confirming job queueing or validation errors.
 */
        generateQuiz: async (req,res,next) => {
            try {
     const parsed = await createQuizSchema.safeParseAsync(req.body);
     if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodValidationError(parsed),
      });
           }
        const {planItemId} = parsed.data;
        const requestId = uuidv4(); 

        const job = await emailQueue.add("quiz-generation",{
          planItemId,
          userId: req.user?.userId,
          requestId
        })

          return res.status(202).json({
        message: 'quiz generation started',
        jobId: job.id,
        requestId,
        statusUrl: ``,
      });
       
          } catch (error) {
           next(error); 
          }
        }
      
    }
}


