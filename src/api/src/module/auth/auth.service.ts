import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../../config/index.js';
import HttpError from '../../config/handler/HttpError/HttpError.js';
import QueueManager from '../../lib/queue.js';
import {
  SignupInput,
  VerifyEmailInput,
  LoginInput,
  VerifyLoginCodeInput,
  ResendVerificationInput,
} from './schema/auth.schema.js';


export class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // Generate random token
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate 6-digit code
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate JWT token
  private generateJWT(userId: string, email: string): string {
    
    return jwt.sign({userId,email},config.JWT_SECRET,{expiresIn: "7d"});
  }

  // 1. SIGNUP
  async signup(data: SignupInput) {
    const { email, username } = data;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HttpError('User with this email already exists', 409, 'conflict',null);
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        emailVerified: false,
      },
    });

    // Create verification token
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'email_verification',
        expiresAt,
      },
    });

    // Queue verification email
    await QueueManager.addEmailJob({
      to: email,
      username,
      type: 'verification',
      data: { token },
    });

    return {
      message: 'Signup successful! Please check your email to verify your account.',
      userId: user.id,
    };
  }

  // 2. VERIFY EMAIL
  async verifyEmail(data: VerifyEmailInput) {
    const { token } = data;

    // Find token
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new HttpError('Invalid verification token', 400, 'bad_request',null);
    }

    if (verificationToken.used) {
      throw new HttpError('Token has already been used', 400, 'bad_request',null);
    }

    if (new Date() > verificationToken.expiresAt) {
      throw new HttpError('Token has expired', 400, 'bad_request',null);
    }

    // Update user and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    // Queue welcome email
    await QueueManager.addEmailJob({
      to: verificationToken.user.email,
      username: verificationToken.user.username,
      type: 'welcome',
      data: {},
    });

    return {
      message: 'Email verified successfully! You can now log in.',
    };
  }

  // 3. LOGIN (send code)
  async login(data: LoginInput) {
    const { email } = data;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError('User not found', 404, 'not_found',null);
    }

    if (!user.emailVerified) {
      throw new HttpError(
        'Please verify your email before logging in',
        403,
        'forbidden',
        null
      );
    }

    if (!user.isActive) {
      throw new HttpError('Account has been disabled', 403, 'forbidden',null);
    }

    // Generate 6-digit code
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes

    // Save code to database
    await this.prisma.loginVerificationCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    // Queue login code email
    await QueueManager.addEmailJob({
      to: email,
      username: user.username,
      type: 'login_code',
      data: { code },
    });

    return {
      message: 'Verification code sent to your email',
      email: email,
    };
  }

  // 4. VERIFY LOGIN CODE (return JWT)
  async verifyLoginCode(data: VerifyLoginCodeInput) {
    const { email, code } = data;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError('User not found', 404, 'not_found',null);
    }

    // Find most recent unused code
    const loginCode = await this.prisma.loginVerificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!loginCode) {
      throw new HttpError('Invalid verification code', 400, 'bad_request',null);
    }

    if (new Date() > loginCode.expiresAt) {
      throw new HttpError('Verification code has expired', 400, 'bad_request',null);
    }

    // Mark code as verified
    await this.prisma.loginVerificationCode.update({
      where: { id: loginCode.id },
      data: { verified: true },
    });

    // Generate JWT
    const token = this.generateJWT(user.id, user.email);

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  // 5. RESEND VERIFICATION EMAIL
  async resendVerification(data: ResendVerificationInput) {
    const { email } = data;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError('User not found', 404, 'not_found',null);
    }

    if (user.emailVerified) {
      throw new HttpError('Email is already verified', 400, 'bad_request',null);
    }

    // Delete old unused tokens
    await this.prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Create new token
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'email_verification',
        expiresAt,
      },
    });

    // Queue verification email
    await QueueManager.addEmailJob({
      to: email,
      username: user.username,
      type: 'verification',
      data: { token },
    });

    return {
      message: 'Verification email sent! Please check your inbox.',
    };
  }

  // 6. RESEND LOGIN CODE
  async resendLoginCode(data: LoginInput) {
    // Just call login again - it will generate a new code
    return await this.login(data);
  }
}