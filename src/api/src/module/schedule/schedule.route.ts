import {Router} from "express";
import authMiddleware from "../../middleware/auth/auth.middleware.js";
import { ScheduleService } from "./schedule.service.js";
import { ScheduleController } from "./schedule.controller.js";
import { responseHandler } from "../../config/handler/responseHandler/response.handler";

const scheduleRouter = Router();
const scheduleService = new ScheduleService();
const scheduleController = ScheduleController(scheduleService) 

scheduleRouter.use(authMiddleware);

scheduleRouter.post("/generate",responseHandler(scheduleController.generate))

export default scheduleRouter;