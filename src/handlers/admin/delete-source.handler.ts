import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConsoleLogger } from '@shared/logger/index.js';
import { handleError } from '@shared/middleware/index.js';
import { successResponse } from '@shared/responses/index.js';
import { SourceService } from '@application/services/source.service.js';
import { DynamoDBSourceRepository } from '@infrastructure/repositories/dynamodb/dynamodb-source.repository.js';
import { getDynamoDbClient } from '@infrastructure/aws/dynamodb/dynamodb-client.js';
import { loadConfig } from '@shared/config/index.js';

const logger = new ConsoleLogger('INFO');
const config = loadConfig();
const client = getDynamoDbClient(config);
const repository = new DynamoDBSourceRepository(client, config.dynamoDbTable, logger);
const service = new SourceService(repository, logger);

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('DeleteSourceHandler invoked');

  try {
    const sourceId = event.pathParameters?.id;

    if (!sourceId) {
      return successResponse({ error: 'Source ID is required' }, 400);
    }

    await service.delete(sourceId);
    return successResponse({ message: 'Source deleted successfully' });
  } catch (error) {
    return handleError(error, logger);
  }
};