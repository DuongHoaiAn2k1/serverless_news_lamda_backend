import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Source, CreateSourceInput, UpdateSourceInput, SourceType, FetchStrategy } from '@domain/source/index.js';
import { SourceStatus } from '@domain/source/index.js';
import type { SourceRepository } from '@infrastructure/repositories/source.repository.js';
import { generateId, getCurrentTimestamp } from '@shared/utils/index.js';
import { InfrastructureError } from '@shared/errors/index.js';
import type { Logger } from '@shared/logger/index.js';

function buildSourceKey(id: string): Record<string, string> {
  return {
    PK: `SOURCE#${id}`,
    SK: 'METADATA',
  };
}

function buildSourceItem(input: CreateSourceInput, id: string, now: string): Record<string, unknown> {
  return {
    ...buildSourceKey(id),
    EntityType: 'SOURCE',
    id,
    name: input.name,
    type: input.type,
    url: input.url,
    status: SourceStatus.ACTIVE,
    priority: input.priority ?? 10,
    fetchInterval: input.fetchInterval ?? 60,
    language: input.language ?? 'en',
    description: input.description ?? '',
    fetchStrategy: input.fetchStrategy ?? 'AUTO',
    createdAt: now,
    updatedAt: now,
  };
}

function mapToSource(item: Record<string, unknown>): Source {
  return {
    id: item['id'] as string,
    name: item['name'] as string,
    type: item['type'] as SourceType,
    url: item['url'] as string,
    status: item['status'] as SourceStatus,
    priority: item['priority'] as number,
    fetchInterval: item['fetchInterval'] as number,
    language: item['language'] as string,
    description: item['description'] as string,
    fetchStrategy: (item['fetchStrategy'] as FetchStrategy) ?? 'AUTO',
    createdAt: item['createdAt'] as string,
    updatedAt: item['updatedAt'] as string,
  };
}

export class DynamoDBSourceRepository implements SourceRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly logger: Logger;

  constructor(client: DynamoDBDocumentClient, tableName: string, logger: Logger) {
    this.client = client;
    this.tableName = tableName;
    this.logger = logger;
  }

  async create(input: CreateSourceInput): Promise<Source> {
    const id = `src_${generateId().split('-')[0]}`;
    const now = getCurrentTimestamp();
    const item = buildSourceItem(input, id, now);

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );

      this.logger.info('Source created', { sourceId: id, name: input.name });

      return mapToSource(item);
    } catch (error) {
      throw new InfrastructureError(
        `Failed to create source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findById(id: string): Promise<Source | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: buildSourceKey(id),
        }),
      );

      if (!result.Item) {
        return null;
      }

      return mapToSource(result.Item);
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find source by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findAll(): Promise<Source[]> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'EntityTypeIndex',
          KeyConditionExpression: 'EntityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': 'SOURCE',
          },
        }),
      );

      return (result.Items ?? []).map(mapToSource);
    } catch (error) {
      throw new InfrastructureError(
        `Failed to find all sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async update(id: string, input: UpdateSourceInput): Promise<Source> {
    const now = getCurrentTimestamp();
    const updateExpression: string[] = ['SET updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, unknown> = {
      ':updatedAt': now,
    };
    const expressionAttributeNames: Record<string, string> = {};

    const fieldMap: Record<string, string> = {
      name: '#name',
      type: '#type',
      url: '#url',
      status: '#status',
      priority: '#priority',
      fetchInterval: '#fetchInterval',
      language: '#language',
      description: '#description',
    };

    for (const [field, placeholder] of Object.entries(fieldMap)) {
      if (input[field as keyof UpdateSourceInput] !== undefined) {
        updateExpression.push(`${placeholder} = :${field}`);
        expressionAttributeValues[`:${field}`] = input[field as keyof UpdateSourceInput] as unknown;
        expressionAttributeNames[placeholder] = field;
      }
    }

    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: buildSourceKey(id),
          UpdateExpression: updateExpression.join(', '),
          ExpressionAttributeValues: expressionAttributeValues,
          ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
          ReturnValues: 'ALL_NEW',
        }),
      );

      if (!result.Attributes) {
        throw new InfrastructureError('Source not found after update', 'DynamoDB');
      }

      this.logger.info('Source updated', { sourceId: id });

      return mapToSource(result.Attributes);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }
      throw new InfrastructureError(
        `Failed to update source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: buildSourceKey(id),
          ConditionExpression: 'attribute_exists(PK)',
        }),
      );

      this.logger.info('Source deleted', { sourceId: id });
    } catch (error) {
      throw new InfrastructureError(
        `Failed to delete source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DynamoDB',
      );
    }
  }

  async findActive(): Promise<Source[]> {
    const all = await this.findAll();
    return all.filter((source) => source.status === SourceStatus.ACTIVE);
  }

  async findByType(type: SourceType): Promise<Source[]> {
    const all = await this.findAll();
    return all.filter((source) => source.type === type);
  }
}