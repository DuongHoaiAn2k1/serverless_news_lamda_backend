/**
 * Local execution script for CollectNewsHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/collect/collect-news.handler.js';

const event = {
  version: '0',
  id: 'local-test-event',
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  account: 'local',
  time: new Date().toISOString(),
  region: 'ap-southeast-1',
  resources: [],
  detail: {},
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.DYNAMODB_TABLE = 'BlogNews';
  process.env.SQS_QUEUE_URL = '';

  console.log('Running CollectNewsHandler locally...');
  await handler(event);
  console.log('CollectNewsHandler completed successfully');
}

main().catch((error) => {
  console.error('CollectNewsHandler failed:', error);
  process.exit(1);
});