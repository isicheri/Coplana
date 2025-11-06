import { Router } from "express";
import authRouter from "./module/auth/auth.route.js";
import scheduleRouter from "./module/schedule/schedule.route.js";
import quizRouter from "./module/quiz/quiz.route.js";

const indexRouter = Router();

indexRouter.use("/auth",authRouter);
indexRouter.use("/schedules",scheduleRouter)
indexRouter.use("/quiz",quizRouter);

export default indexRouter;