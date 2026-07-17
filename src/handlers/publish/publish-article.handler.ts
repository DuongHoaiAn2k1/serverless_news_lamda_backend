import type { EventBridgeHandler } from 'aws-lambda';
import { ConsoleLogger } from '@shared/logger/index.js';
import { handleError } from '@shared/middleware/index.js';

const logger = new ConsoleLogger('INFO');

export const handler: EventBridgeHandler<'ArticleApproved', { articleId: string }, void> = async (event) => {
  logger.info('PublishArticleHandler invoked', { articleId: event.detail.articleId });

  try {
    const { articleId } = event.detail;

    // TODO: Implement article publishing logic
    // 1. Fetch article from DynamoDB
    // 2. Verify article is APPROVED
    // 3. Generate HTML/content for website
    // 4. Upload to S3 or publish via API
    // 5. Update article status to PUBLISHED
    // 6. Send notification via EventBridge

    logger.info('Article published', { articleId });
  } catch (error) {
    handleError(error, logger);
    throw error;
  }
};