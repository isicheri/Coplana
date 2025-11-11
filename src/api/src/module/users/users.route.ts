import { Router } from "express";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { responseHandler } from "../../config/handler/responseHandler/response.handler.js";
import authMiddleware from "../../middleware/auth/auth.middleware.js";


const usersRouter = Router()
const service = new UsersService();
const controller = UsersController(service);

usersRouter.use(authMiddleware);

usersRouter.get("/quiz-history",responseHandler(controller.getUserQuizHistory))

export default usersRouter;