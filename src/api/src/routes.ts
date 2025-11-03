import { Router } from "express";
import authRouter from "./module/auth/auth.route.js";

const indexRouter = Router();

indexRouter.use("/auth",authRouter);

export default indexRouter;