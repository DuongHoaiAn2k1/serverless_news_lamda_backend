import type { Tag, CreateTagInput } from '@domain/tag/index.js';

export interface TagRepository {
  create(input: CreateTagInput): Promise<Tag>;
  findById(id: string): Promise<Tag | null>;
  findAll(): Promise<Tag[]>;
  delete(id: string): Promise<void>;
  findBySlug(slug: string): Promise<Tag | null>;
  incrementArticleCount(id: string): Promise<void>;
  decrementArticleCount(id: string): Promise<void>;
}