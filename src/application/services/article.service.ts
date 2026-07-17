import type { Article, CreateArticleInput, UpdateArticleInput } from '@domain/article/index.js';
import { ArticleStatus } from '@domain/article/index.js';
import { createArticleSchema, updateArticleSchema } from '@domain/article/index.js';
import type { ArticleRepository, ArticleFindOptions, ArticleCountOptions } from '@infrastructure/repositories/article.repository.js';
import { validateOrThrow } from '@shared/validation/index.js';
import { NotFoundError } from '@shared/errors/index.js';
import type { Logger } from '@shared/logger/index.js';

export class ArticleService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly logger: Logger,
  ) {}

  async create(input: CreateArticleInput): Promise<Article> {
    const validated = validateOrThrow(createArticleSchema, input);
    this.logger.info('Create Article', { sourceId: validated.sourceId, title: validated.original.title });
    return this.articleRepository.create(validated as unknown as CreateArticleInput);
  }

  async findById(id: string): Promise<Article> {
    this.logger.info('Find Article by ID', { articleId: id });
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundError('Article', id);
    }
    return article;
  }

  async findBySlug(slug: string): Promise<Article> {
    this.logger.info('Find Article by Slug', { slug });
    const article = await this.articleRepository.findBySlug(slug);
    if (!article) {
      throw new NotFoundError('Article', slug);
    }
    return article;
  }

  async findAll(options?: ArticleFindOptions): Promise<Article[]> {
    this.logger.info('Find All Articles');
    return this.articleRepository.findAll(options);
  }

  async findByStatus(status: ArticleStatus): Promise<Article[]> {
    this.logger.info('Find Articles by Status', { status });
    return this.articleRepository.findByStatus(status);
  }

  async update(id: string, input: UpdateArticleInput): Promise<Article> {
    const validated = validateOrThrow(updateArticleSchema, input);
    this.logger.info('Update Article', { articleId: id });

    // Verify article exists
    await this.findById(id);

    return this.articleRepository.update(id, validated as unknown as UpdateArticleInput);
  }

  async delete(id: string): Promise<void> {
    this.logger.info('Delete Article', { articleId: id });

    // Verify article exists
    await this.findById(id);

    return this.articleRepository.delete(id);
  }

  async publish(id: string): Promise<Article> {
    this.logger.info('Publish Article', { articleId: id });

    const article = await this.findById(id);

    if (article.status !== ArticleStatus.APPROVED) {
      throw new Error(`Cannot publish article in status ${article.status}. Must be APPROVED.`);
    }

    return this.articleRepository.update(id, {
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date().toISOString(),
    });
  }

  async approve(id: string): Promise<Article> {
    this.logger.info('Approve Article', { articleId: id });

    const article = await this.findById(id);

    if (article.status !== ArticleStatus.PENDING_REVIEW) {
      throw new Error(`Cannot approve article in status ${article.status}. Must be PENDING_REVIEW.`);
    }

    return this.articleRepository.update(id, {
      status: ArticleStatus.APPROVED,
    });
  }

  async reject(id: string): Promise<Article> {
    this.logger.info('Reject Article', { articleId: id });

    const article = await this.findById(id);

    if (article.status !== ArticleStatus.PENDING_REVIEW) {
      throw new Error(`Cannot reject article in status ${article.status}. Must be PENDING_REVIEW.`);
    }

    return this.articleRepository.update(id, {
      status: ArticleStatus.REJECTED,
    });
  }

  async archive(id: string): Promise<Article> {
    this.logger.info('Archive Article', { articleId: id });

    const article = await this.findById(id);

    if (article.status === ArticleStatus.ARCHIVED) {
      throw new Error(`Article is already archived.`);
    }

    return this.articleRepository.update(id, {
      status: ArticleStatus.ARCHIVED,
    });
  }

  async count(options?: ArticleCountOptions): Promise<number> {
    return this.articleRepository.count(options);
  }
}