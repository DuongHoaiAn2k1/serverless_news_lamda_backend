/**
 * Local execution script for UpdateSourceHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/update-source.handler.js';

const event = {
  resource: '/admin/sources/{id}',
  path: '/admin/sources/src_demo123',
  httpMethod: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  queryStringParameters: null,
  pathParameters: { id: 'src_demo123' },
  body: JSON.stringify({
    name: 'AWS Blog Updated',
    priority: 5,
    fetchInterval: 30,
  }),
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'blognews-articles';

  console.log('Running UpdateSourceHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('UpdateSourceHandler completed successfully');
}

main().catch((error) => {
  console.error('UpdateSourceHandler failed:', error);
  process.exit(1);
});