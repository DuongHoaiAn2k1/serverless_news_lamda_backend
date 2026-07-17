/**
 * Local execution script for PublishArticleHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/publish/publish-article.handler.js';

const event = {
  version: '0',
  id: 'local-publish-event',
  'detail-type': 'ArticleApproved',
  source: 'com.blognews',
  account: 'local',
  time: new Date().toISOString(),
  region: 'us-east-1',
  resources: [],
  detail: {
    articleId: 'test-article-id-001',
  },
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'blognews-articles-local';
  process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';

  console.log('Running PublishArticleHandler locally...');
  await handler(event);
  console.log('PublishArticleHandler completed successfully');
}

main().catch((error) => {
  console.error('PublishArticleHandler failed:', error);
  process.exit(1);
});