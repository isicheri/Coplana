import { Router } from "express";
import authRouter from "./module/auth/auth.route.js";
import scheduleRouter from "./module/schedule/schedule.route.js";
import quizRouter from "./module/quiz/quiz.route.js";
import subTopicRouter from "./module/subtopic/subtopic.route.js";
import usersRouter from "./module/users/users.route.js";

const indexRouter = Router();

indexRouter.use("/auth",authRouter);
indexRouter.use("/users",usersRouter);
indexRouter.use("/schedules",scheduleRouter)
indexRouter.use("/quiz",quizRouter);
indexRouter.use("/subtopic",subTopicRouter)

export default indexRouter;