import type { Article, CreateArticleInput, UpdateArticleInput, ArticleStatus } from '@domain/article/index.js';

export interface ArticleRepository {
  create(input: CreateArticleInput): Promise<Article>;
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  findAll(options?: ArticleFindOptions): Promise<Article[]>;
  update(id: string, input: UpdateArticleInput): Promise<Article>;
  delete(id: string): Promise<void>;
  findByStatus(status: ArticleStatus): Promise<Article[]>;
  findBySourceId(sourceId: string): Promise<Article[]>;
  count(options?: ArticleCountOptions): Promise<number>;
}

export interface ArticleFindOptions {
  status?: ArticleStatus;
  sourceId?: string;
  categoryId?: string;
  tag?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'publishedAt' | 'title';
  orderDirection?: 'ASC' | 'DESC';
}

export interface ArticleCountOptions {
  status?: ArticleStatus;
  sourceId?: string;
  categoryId?: string;
}