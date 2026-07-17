import { z } from 'zod';
import { ValidationError } from '@shared/errors/index.js';

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details: Record<string, string[]> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path]!.push(issue.message);
    }

    throw new ValidationError('Validation failed', details);
  }

  return result.data;
}

export const uuidSchema = z.string().uuid();
export const nonEmptyStringSchema = z.string().min(1, 'Must not be empty');
export const isoDateStringSchema = z.string().datetime({ offset: true });
export const urlSchema = z.string().url('Must be a valid URL');
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});