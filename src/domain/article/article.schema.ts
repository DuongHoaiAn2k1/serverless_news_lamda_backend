import { z } from 'zod';
import { ArticleStatus } from './article-status.enum.js';

export const originalContentSchema = z.object({
  title: z.string().min(1, 'Original title is required'),
  summary: z.string().min(1, 'Original summary is required'),
  content: z.string().min(1, 'Original content is required'),
  url: z.string().url('Original URL must be valid'),
  publishedAt: z.string().datetime({ offset: true }).nullable().default(null),
  image: z.string().default(''),
  author: z.string().default(''),
});

export const aiContentSchema = z.object({
  title: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  content: z.string().nullable().default(null),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  keywords: z.array(z.string()).default([]),
  model: z.string().nullable().default(null),
  promptVersion: z.string().nullable().default(null),
  processedAt: z.string().nullable().default(null),
  processingTime: z.number().nullable().default(null),
  tokenUsage: z.object({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }).nullable().default(null),
});

export const createArticleSchema = z.object({
  sourceId: z.string().min(1, 'Source ID is required'),
  original: originalContentSchema,
  language: z.string().min(1).max(10).default('en'),
  tags: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  author: z.string().optional(),
  coverImage: z.string().optional(),
});

export const updateArticleSchema = z.object({
  slug: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().min(1).max(10).optional(),
  author: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  ai: aiContentSchema.optional(),
  publishedAt: z.string().nullable().optional(),
});

export const articleIdSchema = z.object({
  id: z.string().min(1, 'Article ID is required'),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;