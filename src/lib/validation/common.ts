import { z } from 'zod';
import { ValidationError } from '@/lib/errors/service-errors';

export const trimmedString = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const optionalTrimmedString = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or less.`)
    .transform((value) => value || null)
    .nullable()
    .optional();

export const optionalNumber = z.preprocess((value) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number(trimmed);
  }
  return value;
}, z.number().finite().nonnegative().nullable());

export function fromFormData<T extends Record<string, unknown>>(formData: FormData): T {
  return Object.fromEntries(formData.entries()) as T;
}

export function parseWithSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];
  throw new ValidationError(firstIssue?.message ?? 'Submitted data is invalid.', {
    issues: result.error.flatten(),
  });
}
