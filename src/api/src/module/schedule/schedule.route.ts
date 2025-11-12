import {Router} from "express";
import authMiddleware from "../../middleware/auth/auth.middleware.js";
import { ScheduleService } from "./schedule.service.js";
import { ScheduleController } from "./schedule.controller.js";
import { responseHandler } from "../../config/handler/responseHandler/response.handler.js";

const scheduleRouter = Router();
const scheduleService = new ScheduleService();
const scheduleController = ScheduleController(scheduleService); 

scheduleRouter.use(authMiddleware);

scheduleRouter.post("/generate",responseHandler(scheduleController.generate));
scheduleRouter.post("/save",responseHandler(scheduleController.save));
scheduleRouter.get("/personal",responseHandler(scheduleController.list));
scheduleRouter.delete("/:scheduleId",responseHandler(scheduleController.delete));
scheduleRouter.patch("/:scheduleId/reminders",responseHandler(scheduleController.updateReminders));
scheduleRouter.get("/generation/status/:jobId", responseHandler(scheduleController.generationStatus))

export default scheduleRouter;