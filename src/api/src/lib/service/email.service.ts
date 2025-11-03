import { Resend } from 'resend';
import config from '../../config/index.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@studyplanner.com';

export class EmailService {
  // Send email verification link
  static async sendVerificationEmail(to: string, username: string, token: string) {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: '✅ Verify your email - Study Planner Pro',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📚 Welcome to Study Planner Pro!</h1>
                </div>
                <div class="content">
                  <h2>Hi ${username}! 👋</h2>
                  <p>Thanks for signing up! We're excited to help you ace your studies.</p>
                  <p>Click the button below to verify your email and get started:</p>
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                  <p>Or copy this link into your browser:</p>
                  <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                  <p><strong>This link expires in 24 hours.</strong></p>
                  <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                  <p>Study Planner Pro | AI-Powered Learning</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw new Error('Failed to send verification email');
      }

      console.log('✅ Verification email sent:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  // Send login verification code
  static async sendLoginCode(to: string, code: string, username: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: '🔐 Your login code - Study Planner Pro',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
                .code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #667eea; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Login Verification</h1>
                </div>
                <div class="content">
                  <h2>Hi ${username}! 👋</h2>
                  <p>Here's your login verification code:</p>
                  <div class="code">${code}</div>
                  <p><strong>This code expires in 10 minutes.</strong></p>
                  <p>If you didn't request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                  <p>Study Planner Pro | AI-Powered Learning</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw new Error('Failed to send login code');
      }

      console.log('✅ Login code sent:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  // Send welcome email (after successful verification)
  static async sendWelcomeEmail(to: string, username: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: '🎉 Welcome to Study Planner Pro!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 You're All Set!</h1>
                </div>
                <div class="content">
                  <h2>Welcome aboard, ${username}! 🚀</h2>
                  <p>Your email has been verified. Here's what you can do now:</p>
                  
                  <div class="feature">
                    <strong>📚 Create Study Plans</strong>
                    <p>Generate AI-powered study schedules for any topic</p>
                  </div>
                  
                  <div class="feature">
                    <strong>✅ Take Quizzes</strong>
                    <p>Test your knowledge with adaptive quizzes</p>
                  </div>
                  
                  <div class="feature">
                    <strong>📊 Track Progress</strong>
                    <p>Monitor your learning journey with analytics</p>
                  </div>
                  
                  <p style="margin-top: 30px;">Ready to start learning?</p>
                  <a href="${config.FRONTEND_URL}/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Go to Dashboard</a>
                </div>
                <div class="footer">
                  <p>Study Planner Pro | AI-Powered Learning</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        return null;
      }

      console.log('✅ Welcome email sent:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Welcome email failed:', error);
      return null; // Don't fail if welcome email fails
    }
  }
}

export default EmailService;