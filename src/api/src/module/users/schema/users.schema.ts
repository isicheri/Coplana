import {z} from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
  });

export const GetUserHistorySchema = z.object({
   status: z.enum(["complete","incomplete"]).transform(sanitize)
})


export type GetUserHistorySchemaDto = z.infer<typeof GetUserHistorySchema>