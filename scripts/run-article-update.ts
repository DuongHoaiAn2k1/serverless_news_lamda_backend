/**
 * Local execution script for UpdateArticleHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/update-article.handler.js';

const event = {
  resource: '/admin/articles/{id}',
  path: '/admin/articles/art_abc123',
  httpMethod: 'PUT',
  headers: {},
  queryStringParameters: null,
  pathParameters: { id: 'art_abc123' },
  body: JSON.stringify({
    status: 'APPROVED',
    tags: ['aws', 'serverless', 'lambda', 'featured'],
  }),
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.DYNAMODB_TABLE = 'BlogNews';

  console.log('Running UpdateArticleHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('UpdateArticleHandler completed successfully');
}

main().catch((error) => {
  console.error('UpdateArticleHandler failed:', error);
  process.exit(1);
});