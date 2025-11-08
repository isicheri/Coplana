import {Router } from "express";
import { SubtopicController } from "./subtopic.controller.js";
import { SubtopicService } from "./subtopic.service.js";
import { responseHandler } from "../../config/handler/responseHandler/response.handler.js";
import {authMiddleware} from "../../middleware/auth/auth.middleware.js"

const subTopicRouter = Router();
const service = new SubtopicService();
const controller = SubtopicController
(service);

subTopicRouter.use(authMiddleware);

subTopicRouter.patch("/update",responseHandler(controller.update));

export default subTopicRouter;