import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConsoleLogger } from '@shared/logger/index.js';
import { handleError } from '@shared/middleware/index.js';
import { successResponse } from '@shared/responses/index.js';

const logger = new ConsoleLogger('INFO');

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('TelegramWebhookHandler invoked');

  try {
    const body = JSON.parse(event.body ?? '{}');

    // TODO: Implement Telegram webhook logic
    // 1. Verify Telegram secret token
    // 2. Parse message/command
    // 3. Handle commands (list, approve, reject, publish)
    // 4. Send response back to Telegram

    logger.info('Webhook message received', { updateId: body.update_id });
    return successResponse({ status: 'ok' });
  } catch (error) {
    return handleError(error, logger);
  }
};