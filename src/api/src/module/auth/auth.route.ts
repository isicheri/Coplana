import { Router } from 'express';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { responseHandler } from '../../config/handler/responseHandler/response.handler.js';

const authRouter = Router();
const authService = new AuthService();
const authController = AuthController(authService);

// Public routes
authRouter.post('/signup', responseHandler(authController.signup));
authRouter.post('/verify-email', responseHandler(authController.verifyEmail));
authRouter.post('/login', responseHandler(authController.login));
authRouter.post('/verify-login', responseHandler(authController.verifyLoginCode));
authRouter.post('/resend-verification', responseHandler(authController.resendVerification));
authRouter.post('/resend-login-code', responseHandler(authController.resendLoginCode));

export default authRouter;