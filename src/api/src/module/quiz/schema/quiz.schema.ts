import {z} from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
  });

const startQuizSchema = z.object({
  userId: z.string(),
});


export type startQuizSchemaDto = z.infer<typeof startQuizSchema>;