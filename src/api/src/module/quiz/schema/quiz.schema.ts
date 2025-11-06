import {z} from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
  });

export const startQuizSchema = z.object({
  userId: z.string(),
  quizId: z.string()
});

export const submitQuizSchema = z.object({
 quizId: z.string().optional(),
  attemptId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string().nullable(), // null if skipped
    })
  ),
  timeTaken: z.number().optional(), // seconds
});

// Define the type for user answers
export type UserAnswerData = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
};



export type startQuizSchemaDto = z.infer<typeof startQuizSchema>;
export type submitQuizSchemaDto = z.infer<typeof submitQuizSchema>;