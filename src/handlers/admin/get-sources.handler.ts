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

export const handler: APIGatewayProxyHandler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('GetSourcesHandler invoked');

  try {
    const sources = await service.findAll();
    return successResponse({ sources });
  } catch (error) {
    return handleError(error, logger);
  }
};