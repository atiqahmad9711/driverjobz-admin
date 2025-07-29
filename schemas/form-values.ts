import { z } from "zod";

export const formValueSchema = z.object({
  formValueId: z.number(),
  formValueSlug: z.string(),
  valueEn: z.string(),
  valueEs: z.string(),
  descriptionEn: z.string(),
  descriptionEs: z.string(),
  formFieldId: z.number(),
  isActive: z.boolean(),
  groupEn: z.string().optional().nullable(),
  groupEs: z.string().optional().nullable(),
  inCategorySlug: z.array(z.string()),
  type: z.string(),
  rank: z.number().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
  deletedAt: z.date().or(z.string()).nullable().optional(),
});

export type FormValue = z.infer<typeof formValueSchema>;

export const updateFormValueSchema = formValueSchema.partial().required({
  formValueId: true,
});

export type UpdateFormValueInput = z.infer<typeof updateFormValueSchema>;
