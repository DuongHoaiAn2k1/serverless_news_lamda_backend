/**
 * Local execution script for ToggleSourceHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/toggle-source.handler.js';

const event = {
  resource: '/admin/sources/{id}/toggle',
  path: '/admin/sources/src_demo123/toggle',
  httpMethod: 'PATCH',
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

  console.log('Running ToggleSourceHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('ToggleSourceHandler completed successfully');
}

main().catch((error) => {
  console.error('ToggleSourceHandler failed:', error);
  process.exit(1);
});