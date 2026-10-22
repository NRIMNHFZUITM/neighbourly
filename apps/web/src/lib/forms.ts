import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/** Validates with a shared Zod contract and returns the first message per field. */
export function validate<T>(schema: z.ZodType<T>, value: unknown): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(value);
  if (result.success) return { data: result.data, errors: null };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}
