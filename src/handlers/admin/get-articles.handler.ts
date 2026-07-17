import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConsoleLogger } from '@shared/logger/index.js';
import { handleError } from '@shared/middleware/index.js';
import { successResponse } from '@shared/responses/index.js';
import { ArticleService } from '@application/services/article.service.js';
import { DynamoDBArticleRepository } from '@infrastructure/repositories/dynamodb/dynamodb-article.repository.js';
import { getDynamoDbClient } from '@infrastructure/aws/dynamodb/dynamodb-client.js';
import { loadConfig } from '@shared/config/index.js';

const logger = new ConsoleLogger('INFO');

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('GetArticlesHandler invoked');

  try {
    const config = loadConfig();
    const client = getDynamoDbClient(config);
    const repository = new DynamoDBArticleRepository(client, config.dynamoDbTable, logger);
    const service = new ArticleService(repository, logger);

    const queryParams = event.queryStringParameters ?? {};
    const limit = parseInt(queryParams['limit'] ?? '20', 10);
    const offset = parseInt(queryParams['offset'] ?? '0', 10);
    const status = queryParams['status'] as string | undefined;
    const sourceId = queryParams['sourceId'] as string | undefined;
    const categoryId = queryParams['categoryId'] as string | undefined;

    const articles = await service.findAll({
      ...(status && { status: status as any }),
      ...(sourceId && { sourceId }),
      ...(categoryId && { categoryId }),
      limit,
      offset,
      orderBy: 'createdAt',
      orderDirection: 'DESC',
    });

    const total = await service.count({ status: status as any, sourceId, categoryId });

    return successResponse({ articles, total, limit, offset });
  } catch (error) {
    return handleError(error, logger);
  }
};