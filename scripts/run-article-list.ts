/**
 * Local execution script for GetArticlesHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/get-articles.handler.js';

const event = {
  resource: '/admin/articles',
  path: '/admin/articles',
  httpMethod: 'GET',
  headers: {},
  queryStringParameters: { limit: '10', offset: '0' },
  pathParameters: null,
  body: null,
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.DYNAMODB_TABLE = 'BlogNews';

  console.log('Running GetArticlesHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('GetArticlesHandler completed successfully');
}

main().catch((error) => {
  console.error('GetArticlesHandler failed:', error);
  process.exit(1);
});