/**
 * Local execution script for GetArticleHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/get-article.handler.js';

const event = {
  resource: '/admin/articles/{id}',
  path: '/admin/articles/art_abc123',
  httpMethod: 'GET',
  headers: {},
  queryStringParameters: null,
  pathParameters: { id: 'art_abc123' },
  body: null,
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.DYNAMODB_TABLE = 'BlogNews';

  console.log('Running GetArticleHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('GetArticleHandler completed successfully');
}

main().catch((error) => {
  console.error('GetArticleHandler failed:', error);
  process.exit(1);
});