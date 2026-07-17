/**
 * Local execution script for GetSourceHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/get-source.handler.js';

const event = {
  resource: '/admin/sources/{id}',
  path: '/admin/sources/src_demo123',
  httpMethod: 'GET',
  headers: {},
  queryStringParameters: null,
  pathParameters: { id: 'src_demo123' },
  body: null,
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'blognews-articles';

  console.log('Running GetSourceHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('GetSourceHandler completed successfully');
}

main().catch((error) => {
  console.error('GetSourceHandler failed:', error);
  process.exit(1);
});