import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Article, CreateArticleInput, UpdateArticleInput, ArticleStatus } from '@domain/article/index.js';
import type { ArticleFindOptions, ArticleCountOptions } from '@infrastructure/repositories/article.repository.js';
import { ArticleStatus as ArticleStatusEnum } from '@domain/article/index.js';
import type { ArticleRepository } from '@infrastructure/repositories/article.repository.js';
import { generateId, getCurrentTimestamp, toSlug } from '@shared/utils/index.js';
import { InfrastructureError } from '@shared/errors/index.js';
import type { Logger } from '@shared/logger/index.js';

function buildArticleKey(id: string): Record<string, string> {
  return {
    PK: `ARTICLE#${id}`,
    SK: 'METADATA',
  };
}

function buildArticleItem(input: CreateArticleInput, id: string, slug: string, now: string): Record<string, unknown> {
  return {
    ...buildArticleKey(id),
    EntityType: 'ARTICLE',
    id,
    slug,
    sourceId: input.sourceId,
    categoryId: input.categoryId ?? null,
    tags: input.tags ?? [],
    language: input.language ?? 'en',
    author: input.author ?? input.original.author,
    coverImage: input.coverImage ?? input.original.image,
    original: {
      title: input.original.title,
      summary: input.original.summary,
      content: input.original.content,
      url: input.original.url,
      publishedAt: input.original.publishedAt ?? null,
      image: input.original.image ?? '',
      author: input.original.author ?? '',
    },
    ai: {
      title: null,
      summary: null,
      content: null,
      seoTitle: null,
      seoDescription: null,
      keywords: [],
      model: null,
      promptVersion: null,
      processedAt: null,
      processingTime: null,
      tokenUsage: null,
    },
    status: ArticleStatusEnum.RAW,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function mapToArticle(item: Record<string, unknown>): Article {
  return {
    id: item['id'] as string,
    slug: item['slug'] as string,
    sourceId: item['sourceId'] as string,
    categoryId: item['categoryId'] as string | null,
    tags: item['tags'] as string[],
    language: item['language'] as string,
    author: item['author'] as string,
    coverImage: item['coverImage'] as string,
    original: item['original'] as Article['original'],
    ai: item['ai'] as Article['ai'],
    status: item['status'] as ArticleStatus,
    publishedAt: item['publishedAt'] as string | null,
    createdAt: item['createdAt'] as string,
    updatedAt: item['updatedAt'] as string,
  };
}

export class DynamoDBArticleRepository implements ArticleRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly logger: Logger;

  constructor(client: DynamoDBDocumentClient, tableName: string, logger: Logger) {
    this.client = client;
    this.tableName = tableName;
    this.logger = logger;
  }

  async create(input: CreateArticleInput): Promise<Article> {
    const id = `art_${generateId().split('-')[0]}`;
    const slug = toSlug(input.original.title);
    const now = getCurrentTimestamp();
    const item = buildArticleItem(input, id, slug, now);

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );

      this.logger.info('Article created', { articleId: id, slug, sourceId: input.sourceId });

      return mapToArticle(item);
    } catch (error) {
      throw new InfrastructureError(
        `Failed to create article: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findById(id: string): Promise<Article | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: buildArticleKey(id),
        }),
      );

      if (!result.Item) {
        return null;
      }

      return mapToArticle(result.Item);
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find article by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findBySlug(slug: string): Promise<Article | null> {
    // Future: Use a SlugIndex GSI for direct lookup
    // Current: Query all ARTICLE items and filter by slug
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'EntityTypeIndex',
          KeyConditionExpression: 'EntityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': 'ARTICLE',
          },
        }),
      );

      const articles = (result.Items ?? []).map(mapToArticle);
      return articles.find((a) => a.slug === slug) ?? null;
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find article by slug: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findAll(options?: ArticleFindOptions): Promise<Article[]> {
    try {
      const { limit, offset, status, sourceId, categoryId, tag, orderBy, orderDirection } = options ?? {};

      // Use StatusIndex if filtering by status for efficiency
      if (status) {
        return this.findByStatus(status, { limit, offset });
      }

      // Use SourceIndex if filtering by sourceId for efficiency
      if (sourceId) {
        return this.findBySourceId(sourceId, { limit, offset });
      }

      // Use EntityTypeIndex for general listing
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'EntityTypeIndex',
          KeyConditionExpression: 'EntityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': 'ARTICLE',
          },
          ...(limit && { Limit: limit + (offset ?? 0) }),
        }),
      );

      let articles = (result.Items ?? []).map(mapToArticle);

      // Apply in-memory filters for fields without GSIs
      if (categoryId) {
        articles = articles.filter((a) => a.categoryId === categoryId);
      }
      if (tag) {
        articles = articles.filter((a) => a.tags.includes(tag));
      }

      // Apply ordering
      if (orderBy) {
        articles.sort((a, b) => {
          const aVal = orderBy === 'createdAt' ? a.createdAt : orderBy === 'publishedAt' ? (a.publishedAt ?? '') : a.slug;
          const bVal = orderBy === 'createdAt' ? b.createdAt : orderBy === 'publishedAt' ? (b.publishedAt ?? '') : b.slug;
          const cmp = String(aVal).localeCompare(String(bVal));
          return orderDirection === 'DESC' ? -cmp : cmp;
        });
      }

      // Apply offset
      if (offset) {
        articles = articles.slice(offset);
      }

      return articles;
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find all articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async update(id: string, input: UpdateArticleInput): Promise<Article> {
    const now = getCurrentTimestamp();
    const updateExpression: string[] = ['SET updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, unknown> = {
      ':updatedAt': now,
    };
    const expressionAttributeNames: Record<string, string> = {};

    const fieldMap: Record<string, string> = {
      slug: '#slug',
      categoryId: '#categoryId',
      tags: '#tags',
      language: '#language',
      author: '#author',
      coverImage: '#coverImage',
      status: '#status',
      publishedAt: '#publishedAt',
    };

    for (const [field, placeholder] of Object.entries(fieldMap)) {
      if (input[field as keyof UpdateArticleInput] !== undefined) {
        updateExpression.push(`${placeholder} = :${field}`);
        expressionAttributeValues[`:${field}`] = input[field as keyof UpdateArticleInput] as unknown;
        expressionAttributeNames[placeholder] = field;
      }
    }

    // Handle nested ai object updates
    if (input.ai) {
      const aiFields: Record<string, string> = {
        title: 'ai.#title',
        summary: 'ai.#summary',
        content: 'ai.#content',
        seoTitle: 'ai.#seoTitle',
        seoDescription: 'ai.#seoDescription',
        keywords: 'ai.#keywords',
        model: 'ai.#model',
        promptVersion: 'ai.#promptVersion',
        processedAt: 'ai.#processedAt',
        processingTime: 'ai.#processingTime',
        tokenUsage: 'ai.#tokenUsage',
      };

      for (const [field, expr] of Object.entries(aiFields)) {
        if ((input.ai as Record<string, unknown>)[field] !== undefined) {
          updateExpression.push(`${expr} = :ai_${field}`);
          expressionAttributeValues[`:ai_${field}`] = (input.ai as Record<string, unknown>)[field] as unknown;
          expressionAttributeNames[`#${field}`] = field;
          expressionAttributeNames['#title'] = 'title';
          expressionAttributeNames['#summary'] = 'summary';
          expressionAttributeNames['#content'] = 'content';
          expressionAttributeNames['#seoTitle'] = 'seoTitle';
          expressionAttributeNames['#seoDescription'] = 'seoDescription';
          expressionAttributeNames['#keywords'] = 'keywords';
          expressionAttributeNames['#model'] = 'model';
          expressionAttributeNames['#promptVersion'] = 'promptVersion';
          expressionAttributeNames['#processedAt'] = 'processedAt';
          expressionAttributeNames['#processingTime'] = 'processingTime';
          expressionAttributeNames['#tokenUsage'] = 'tokenUsage';
        }
      }
    }

    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: buildArticleKey(id),
          UpdateExpression: updateExpression.join(', '),
          ExpressionAttributeValues: expressionAttributeValues,
          ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
          ReturnValues: 'ALL_NEW',
        }),
      );

      if (!result.Attributes) {
        throw new InfrastructureError('Article not found after update', 'DynamoDB');
      }

      this.logger.info('Article updated', { articleId: id });

      return mapToArticle(result.Attributes);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }
      throw new InfrastructureError(
        `Failed to update article: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: buildArticleKey(id),
          ConditionExpression: 'attribute_exists(PK)',
        }),
      );

      this.logger.info('Article deleted', { articleId: id });
    } catch (error) {
      throw new InfrastructureError(
        `Failed to delete article: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findByStatus(status: ArticleStatus, options?: { limit?: number; offset?: number }): Promise<Article[]> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': status,
          },
          ...(options?.limit && { Limit: options.limit + (options.offset ?? 0) }),
        }),
      );

      let articles = (result.Items ?? []).map(mapToArticle);

      if (options?.offset) {
        articles = articles.slice(options.offset);
      }

      return articles;
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find articles by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findBySourceId(sourceId: string, options?: { limit?: number; offset?: number }): Promise<Article[]> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'SourceIndex',
          KeyConditionExpression: 'sourceId = :sourceId',
          ExpressionAttributeValues: {
            ':sourceId': sourceId,
          },
          ...(options?.limit && { Limit: options.limit + (options.offset ?? 0) }),
        }),
      );

      let articles = (result.Items ?? []).map(mapToArticle);

      if (options?.offset) {
        articles = articles.slice(options.offset);
      }

      return articles;
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find articles by sourceId: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async count(options?: ArticleCountOptions): Promise<number> {
    try {
      if (options?.status) {
        const articles = await this.findByStatus(options.status);
        return articles.length;
      }

      if (options?.sourceId) {
        const articles = await this.findBySourceId(options.sourceId);
        return articles.length;
      }

      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'EntityTypeIndex',
          KeyConditionExpression: 'EntityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': 'ARTICLE',
          },
          Select: 'COUNT',
        }),
      );

      return result.Count ?? 0;
    } catch (error) {
      throw new InfrastructureError(
        `Failed to count articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }
}