import { z } from 'zod';
import { SourceType } from './source-type.enum.js';
import { SourceStatus } from './source-status.enum.js';
import { FetchStrategy } from './fetch-strategy.enum.js';

export const createSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(SourceType, { required_error: 'Type is required' }),
  url: z.string().url('Must be a valid URL'),
  priority: z.number().int().min(1, 'Priority must be >= 1').optional(),
  fetchInterval: z.number().int().positive('fetchInterval must be > 0').optional(),
  language: z.string().min(1).max(10).default('en'),
  description: z.string().optional().default(''),
  fetchStrategy: z.nativeEnum(FetchStrategy).optional(),
});

export const updateSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.nativeEnum(SourceType).optional(),
  url: z.string().url('Must be a valid URL').optional(),
  status: z.nativeEnum(SourceStatus).optional(),
  priority: z.number().int().min(1, 'Priority must be >= 1').optional(),
  fetchInterval: z.number().int().positive('fetchInterval must be > 0').optional(),
  language: z.string().min(1).max(10).optional(),
  description: z.string().optional(),
  fetchStrategy: z.nativeEnum(FetchStrategy).optional(),
});

export const sourceIdSchema = z.object({
  id: z.string().min(1, 'Source ID is required'),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;