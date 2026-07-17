/**
 * Local execution script for GetSourcesHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/get-sources.handler.js';

const event = {
  resource: '/admin/sources',
  path: '/admin/sources',
  httpMethod: 'GET',
  headers: {},
  queryStringParameters: null,
  pathParameters: null,
  body: null,
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'blognews-articles';

  console.log('Running GetSourcesHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('GetSourcesHandler completed successfully');
}

main().catch((error) => {
  console.error('GetSourcesHandler failed:', error);
  process.exit(1);
});