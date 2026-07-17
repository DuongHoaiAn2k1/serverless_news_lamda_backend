import type { APIGatewayProxyResult } from 'aws-lambda';
import { ApplicationError } from '@shared/errors/index.js';
import { errorResponse } from '@shared/responses/index.js';
import type { Logger } from '@shared/logger/index.js';

export function handleError(error: unknown, logger: Logger): APIGatewayProxyResult {
  if (error instanceof ApplicationError) {
    logger.warn('Application error handled', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });

    return errorResponse(
      error.statusCode,
      error.code,
      error.message,
      'details' in error ? (error as any).details : undefined,
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error occurred';

  logger.error('Unhandled error', {
    message,
    error: error instanceof Error ? error.stack : undefined,
  });

  return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}