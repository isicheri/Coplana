import { Router } from "express";
import authMiddleware from "../../middleware/auth/auth.middleware.js";

const quizRouter = Router();
quizRouter.use(authMiddleware);

// quizRouter.post() //start quiz

export default quizRouter;