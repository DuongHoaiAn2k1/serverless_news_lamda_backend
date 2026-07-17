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
  logger.info('UpdateArticleHandler invoked');

  try {
    const config = loadConfig();
    const client = getDynamoDbClient(config);
    const repository = new DynamoDBArticleRepository(client, config.dynamoDbTable, logger);
    const service = new ArticleService(repository, logger);

    const articleId = event.pathParameters?.id;

    if (!articleId) {
      return successResponse({ error: 'Article ID is required' }, 400);
    }

    const body = JSON.parse(event.body ?? '{}');
    const article = await service.update(articleId, body);

    return successResponse({ article });
  } catch (error) {
    return handleError(error, logger);
  }
};