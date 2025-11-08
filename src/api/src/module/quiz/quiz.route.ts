import { Router } from "express";
import authMiddleware from "../../middleware/auth/auth.middleware.js";
import { responseHandler } from "../../config/handler/responseHandler/response.handler.js";
import { QuizService } from "./quiz.service.js";
import { quizController } from "./quiz.controller.js";
import { QuizAttemtService } from "../quizattempt/quizAttempt.service.js";

const quizRouter = Router();
const quizService = new QuizService();
const quizAttemtService = new QuizAttemtService();
const controller = quizController(quizService,quizAttemtService);
quizRouter.use(authMiddleware);

quizRouter.post("/:quizId/start",responseHandler(controller.start));
quizRouter.post("/:quizId/submit",responseHandler(controller.submit));
quizRouter.get("/attempts/:attemptId",responseHandler(controller.getQuizAttempt))
quizRouter.post("/attempts/:attemptId/resume",responseHandler(controller.resumeQuiz))
quizRouter.post("/generate",responseHandler(controller.generateQuiz))

export default quizRouter;