/**
 * Local execution script for HealthCheckHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/health-check.handler.js';

const event = {
  resource: '/health',
  path: '/health',
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

  console.log('Running HealthCheckHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('HealthCheckHandler completed successfully');
}

main().catch((error) => {
  console.error('HealthCheckHandler failed:', error);
  process.exit(1);
});