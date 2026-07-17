/**
 * Local execution script for ProcessNewsHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/processing/process-news.handler.js';

const event = {
  Records: [
    {
      messageId: 'local-msg-001',
      receiptHandle: 'local-handle-001',
      body: 'test-article-id-001',
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: String(Date.now()),
        SenderId: 'local',
        ApproximateFirstReceiveTimestamp: String(Date.now()),
      },
      messageAttributes: {},
      md5OfBody: 'abc123',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:blognews-processing',
      awsRegion: 'us-east-1',
    },
  ],
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'blognews-articles-local';
  process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';

  console.log('Running ProcessNewsHandler locally...');
  await handler(event);
  console.log('ProcessNewsHandler completed successfully');
}

main().catch((error) => {
  console.error('ProcessNewsHandler failed:', error);
  process.exit(1);
});