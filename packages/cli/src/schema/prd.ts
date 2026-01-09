import { z } from "zod";

export const PrdFeatureSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  passes: z.boolean(),
  acceptance: z.array(z.string().min(1)).min(1),
});

export const PrdSchema = z.array(PrdFeatureSchema).min(1);

export type PrdFeature = z.infer<typeof PrdFeatureSchema>;
export type Prd = z.infer<typeof PrdSchema>;

export interface PrdValidationResult {
  valid: boolean;
  data?: Prd;
  errors?: string[];
}

export function validatePrd(data: unknown): PrdValidationResult {
  const result = PrdSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { valid: false, errors };
}
