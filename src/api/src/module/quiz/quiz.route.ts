import { Router } from "express";
import authMiddleware from "../../middleware/auth/auth.middleware.js";
import { responseHandler } from "../../config/handler/responseHandler/response.handler.js";
import { QuizService } from "./quiz.service.js";
import { quizController } from "./quiz.controller.js";

const quizRouter = Router();
const quizService = new QuizService();
const controller = quizController(quizService);
quizRouter.use(authMiddleware);

quizRouter.post("/:quizId/start",responseHandler(controller.start));
quizRouter.post("/:quizId/submit",responseHandler(controller.submit));

export default quizRouter;