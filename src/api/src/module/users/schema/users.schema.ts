import {z} from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
  });

export const GetUserHistorySchema = z.object({
  status: z
    .enum(["completed", "incomplete"])
    .optional()
    .transform((val) => (val ? sanitize(val) : undefined)),
});


export type GetUserHistorySchemaDto = z.infer<typeof GetUserHistorySchema>