import { ArticleStatus } from './article-status.enum.js';

export interface OriginalContent {
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: string | null;
  image: string;
  author: string;
}

export interface AiContent {
  title: string | null;
  summary: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
  model: string | null;
  promptVersion: string | null;
  processedAt: string | null;
  processingTime: number | null;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  } | null;
}

export interface Article {
  id: string;
  slug: string;
  sourceId: string;
  categoryId: string | null;
  tags: string[];
  language: string;
  author: string;
  coverImage: string;
  original: OriginalContent;
  ai: AiContent;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleInput {
  sourceId: string;
  original: OriginalContent;
  language?: string;
  tags?: string[];
  categoryId?: string;
  author?: string;
  coverImage?: string;
}

export interface UpdateArticleInput {
  slug?: string;
  categoryId?: string | null;
  tags?: string[];
  language?: string;
  author?: string;
  coverImage?: string;
  status?: ArticleStatus;
  ai?: Partial<AiContent>;
  publishedAt?: string | null;
}