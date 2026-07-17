import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { loadConfig } from '@shared/config/index.js';
import { ConsoleLogger } from '@shared/logger/index.js';
import { successResponse } from '@shared/responses/index.js';
import { PROJECT_NAME, PROJECT_VERSION } from '@shared/constants/index.js';

const logger = new ConsoleLogger('INFO');

export const handler: APIGatewayProxyHandler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('HealthCheckHandler invoked');

  const config = loadConfig();

  return successResponse({
    status: 'healthy',
    project: PROJECT_NAME,
    version: PROJECT_VERSION,
    environment: config.appEnv,
    timestamp: new Date().toISOString(),
  });
};