import express from "express";
import { UsersService } from "./users.service.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";
import { GetUserHistorySchema } from "./schema/users.schema.js";
import { formatZodValidationError } from "../auth/schema/auth.schema.js";


interface IUsersController {

    getUserQuizHistory: (req:express.Request,res:express.Response,next: express.NextFunction) => Promise<any>;

}

export const UsersController = (usersService: UsersService):IUsersController => {

    return {

    /**
 * @swagger
 * /api/v1/users/quiz-history:
 *   get:
 *     summary: Get authenticated user's quiz history and statistics
 *     description: Retrieves all quiz attempts for the authenticated user, optionally filtered by completion status. Requires a valid Bearer token.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [completed, incomplete, all]
 *           default: all
 *         description: Filter quiz attempts by completion status.
 *         example: completed
 *     responses:
 *       200:
 *         description: User quiz history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempts:
 *                   type: array
 *                   description: All quiz attempts for the authenticated user
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "7a5d2b4e-8a6e-4a33-b89f-0c5b51a8d413"
 *                       percentage:
 *                         type: number
 *                         example: 85
 *                       completedAt:
 *                         type: string
 *                         nullable: true
 *                         example: "2025-11-05T14:22:30.000Z"
 *                       quiz:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "3e5d2a3b-7a1e-4b5f-b2a4-f1234c5a8b23"
 *                           title:
 *                             type: string
 *                             example: "Photosynthesis Quiz"
 *                           planItem:
 *                             type: object
 *                             properties:
 *                               topic:
 *                                 type: string
 *                                 example: "Biology"
 *                               range:
 *                                 type: string
 *                                 example: "Week 1"
 *                 completed:
 *                   type: array
 *                   description: Completed quiz attempts
 *                   items:
 *                     $ref: '#/components/schemas/QuizAttempt'
 *                 incomplete:
 *                   type: array
 *                   description: Incomplete quiz attempts
 *                   items:
 *                     $ref: '#/components/schemas/QuizAttempt'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalAttempts:
 *                       type: integer
 *                       example: 10
 *                     completedAttempts:
 *                       type: integer
 *                       example: 6
 *                     incompleteAttempts:
 *                       type: integer
 *                       example: 4
 *                     averageScore:
 *                       type: number
 *                       example: 78.5
 *                     bestScore:
 *                       type: number
 *                       example: 95
 *                     worstScore:
 *                       type: number
 *                       example: 40
 *                     passRate:
 *                       type: number
 *                       example: 66.7
 *       400:
 *         description: Validation failed or invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *       401:
 *         description: Unauthorized — missing or invalid token
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
 *                   example: "Unauthorized"
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
        getUserQuizHistory: async(req, res, next) =>  {
           try {
                 
            const userId = req.user?.userId;
            if(!userId) {
               throw new HttpError("User not found",400,"Validation error",null)
            }

            const parsed = await GetUserHistorySchema.safeParseAsync(req.query);

             if(!parsed.success) {
                 return res.status(400).json({
                        error: 'Validation failed',
                        details: formatZodValidationError(parsed),
                      });
             }

            const result = await usersService.getUserHistory(userId,{status: parsed.data.status})
            
            res.status(200).json(result)

           } catch (error) {
            next(error)
           }
        }
    }
}