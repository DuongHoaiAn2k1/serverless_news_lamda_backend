/**
 * Local execution script for CreateSourceHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/create-source.handler.js';

const event = {
  resource: '/admin/sources',
  path: '/admin/sources',
  httpMethod: 'POST',
  headers: { 'Content-Type': 'application/json' },
  queryStringParameters: null,
  pathParameters: null,
  body: JSON.stringify({
    name: 'AWS Blog',
    type: 'RSS',
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    priority: 10,
    fetchInterval: 60,
    language: 'en',
    description: 'Official AWS News Blog',
  }),
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'blognews-articles';

  console.log('Running CreateSourceHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('CreateSourceHandler completed successfully');
}

main().catch((error) => {
  console.error('CreateSourceHandler failed:', error);
  process.exit(1);
});