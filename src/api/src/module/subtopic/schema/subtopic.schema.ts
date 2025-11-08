import {z} from "zod";

export const updateSubtopicSchema = z.object({
  scheduleId: z.string(),
  range: z.string(),
  subIdx: z.number(),
  completed: z.boolean()
});


export type updateSubtopicSchemaDto = z.infer<typeof updateSubtopicSchema>;