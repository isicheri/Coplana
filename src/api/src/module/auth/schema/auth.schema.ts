import { z } from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
  });

// Signup schema
export const SignupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .transform(sanitize),
  email: z.string().email("Invalid email address").transform(sanitize),
});

// Verify email token schema
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// Login schema (email only)
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").transform(sanitize),
});

// Verify login code schema
export const VerifyLoginCodeSchema = z.object({
  email: z.string().email("Invalid email address").transform(sanitize),
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must be numeric"),
});

// Resend verification schema
export const ResendVerificationSchema = z.object({
  email: z.string().email("Invalid email address").transform(sanitize),
});

// Format Zod validation errors
export function formatZodValidationError(parsedBody: z.SafeParseError<any>) {
  const formattedErrors = parsedBody.error.errors.map((e) => ({
    field: e.path[0],
    message: e.message,
  }));

  return formattedErrors;
}

// Type exports
export type SignupInput = z.infer<typeof SignupSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyLoginCodeInput = z.infer<typeof VerifyLoginCodeSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;