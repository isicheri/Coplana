import { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import {
  SignupSchema,
  VerifyEmailSchema,
  LoginSchema,
  VerifyLoginCodeSchema,
  ResendVerificationSchema,
  formatZodValidationError,
} from './schema/auth.schema.js';
import HttpError from '../../config/handler/HttpError/HttpError.js';

interface IAuthController {
  signup: (req: Request, res: Response) => Promise<void>;
  verifyEmail: (req: Request, res: Response) => Promise<void>;
  login: (req: Request, res: Response) => Promise<void>;
  verifyLoginCode: (req: Request, res: Response) => Promise<void>;
  resendVerification: (req: Request, res: Response) => Promise<void>;
  resendLoginCode: (req: Request, res: Response) => Promise<void>;
}

export const AuthController = (authService: AuthService): IAuthController => {
  return {
    /**
     * @swagger
     * /api/v1/auth/signup:
     *   post:
     *     tags: [Authentication]
     *     summary: Register a new user
     *     description: Create a new user account and send email verification
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - username
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *               username:
     *                 type: string
     *                 minLength: 3
     *                 maxLength: 20
     *                 example: johndoe
     *     responses:
     *       201:
     *         description: User created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Signup successful! Please check your email to verify your account.
     *                 userId:
     *                   type: string
     *                   example: clx123abc456
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       409:
     *         description: User already exists
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    signup: async (req, res) => {
      const parsed = SignupSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = formatZodValidationError(parsed);
        throw new HttpError('Validation failed', 400, 'validation_error', errors);
      }

      const result = await authService.signup(parsed.data);
      res.status(201).json(result);
    },

    /**
     * @swagger
     * /api/v1/auth/verify-email:
     *   post:
     *     tags: [Authentication]
     *     summary: Verify email address
     *     description: Verify user's email using the token sent via email
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - token
     *             properties:
     *               token:
     *                 type: string
     *                 example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
     *     responses:
     *       200:
     *         description: Email verified successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Email verified successfully! You can now log in.
     *       400:
     *         description: Invalid or expired token
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    verifyEmail: async (req, res) => {
      const parsed = VerifyEmailSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = formatZodValidationError(parsed);
        throw new HttpError('Validation failed', 400, 'validation_error', errors);
      }

      const result = await authService.verifyEmail(parsed.data);
      res.status(200).json(result);
    },

    /**
     * @swagger
     * /api/v1/auth/login:
     *   post:
     *     tags: [Authentication]
     *     summary: Request login verification code
     *     description: Send 6-digit verification code to user's email
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *     responses:
     *       200:
     *         description: Verification code sent
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Verification code sent to your email
     *                 email:
     *                   type: string
     *                   example: user@example.com
     *       403:
     *         description: Email not verified or account disabled
     *       404:
     *         description: User not found
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    login: async (req, res) => {
      const parsed = LoginSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = formatZodValidationError(parsed);
        throw new HttpError('Validation failed', 400, 'validation_error', errors);
      }

      const result = await authService.login(parsed.data);
      res.status(200).json(result);
    },

    /**
     * @swagger
     * /api/v1/auth/verify-login:
     *   post:
     *     tags: [Authentication]
     *     summary: Verify login code and get JWT
     *     description: Verify the 6-digit code and receive authentication token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - code
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *               code:
     *                 type: string
     *                 pattern: '^[0-9]{6}$'
     *                 example: '123456'
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Login successful
     *                 token:
     *                   type: string
     *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     email:
     *                       type: string
     *                     username:
     *                       type: string
     *       400:
     *         description: Invalid or expired code
     *       404:
     *         description: User not found
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    verifyLoginCode: async (req, res) => {
      const parsed = VerifyLoginCodeSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = formatZodValidationError(parsed);
        throw new HttpError('Validation failed', 400, 'validation_error', errors);
      }

      const result = await authService.verifyLoginCode(parsed.data);
      res.status(200).json(result);
    },

    /**
     * @swagger
     * /api/v1/auth/resend-verification:
     *   post:
     *     tags: [Authentication]
     *     summary: Resend email verification
     *     description: Send a new verification email to unverified users
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *     responses:
     *       200:
     *         description: Verification email sent
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Verification email sent! Please check your inbox.
     *       400:
     *         description: Email already verified
     *       404:
     *         description: User not found
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    resendVerification: async (req, res) => {
      const parsed = ResendVerificationSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = formatZodValidationError(parsed);
        throw new HttpError('Validation failed', 400, 'validation_error', errors);
      }

      const result = await authService.resendVerification(parsed.data);
      res.status(200).json(result);
    },

    /**
     * @swagger
     * /api/v1/auth/resend-login-code:
     *   post:
     *     tags: [Authentication]
     *     summary: Resend login verification code
     *     description: Send a new 6-digit login code
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *     responses:
     *       200:
     *         description: Login code sent
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Verification code sent to your email
     *       403:
     *         description: Email not verified
     *       404:
     *         description: User not found
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    resendLoginCode: async (req, res) => {
      const parsed = LoginSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = formatZodValidationError(parsed);
        throw new HttpError('Validation failed', 400, 'validation_error', errors);
      }

      const result = await authService.resendLoginCode(parsed.data);
      res.status(200).json(result);
    },
  };
};

export default AuthController;