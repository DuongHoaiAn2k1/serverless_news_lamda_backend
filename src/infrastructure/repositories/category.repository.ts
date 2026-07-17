import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@domain/category/index.js';

export interface CategoryRepository {
  create(input: CreateCategoryInput): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  update(id: string, input: UpdateCategoryInput): Promise<Category>;
  delete(id: string): Promise<void>;
  findBySlug(slug: string): Promise<Category | null>;
  findActive(): Promise<Category[]>;
}