import { z } from 'zod';
import sanitizeHtml from "sanitize-html"

const sanitize = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
  });

export const generateScheduleSchema = z.object({
  topic: z.string().min(2, 'Topic must be at least 2 characters'),
  durationUnit: z.enum(['days', 'weeks', 'months']),
  durationValue: z.number().int().positive().min(1).max(52),
});

export const createScheduleSchema = z.object({
  userId: z.string().uuid(),
  title: z.string(),
  plan: z.array(
    z.object({
      range: z.string(),
      topic: z.string(),
      subtopics: z.array(
        z.object({
          t: z.string(),
          completed: z.boolean().default(false),
        })
      ),
    })
  ),
});

export const updateReminderSchema = z.object({
  scheduleId: z.string().uuid(),
  userId: z.string().uuid(),
  toggleInput: z.boolean(),
  startDate: z.string().datetime().nullable(),
});


// Format Zod validation errors
export function formatZodValidationError(parsedBody: z.SafeParseError<any>) {
  const formattedErrors = parsedBody.error.errors.map((e) => ({
    field: e.path[0],
    message: e.message,
  }));
  return formattedErrors
}

export type GenerateScheduleDto = z.infer<typeof generateScheduleSchema>;
export type CreateScheduleDto = z.infer<typeof createScheduleSchema>;
export type UpdateReminderDto = z.infer<typeof updateReminderSchema>;