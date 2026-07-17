import { SQSClient } from '@aws-sdk/client-sqs';
import type { Config } from '@shared/config/index.js';

let client: SQSClient | null = null;

export function getSqsClient(config: Config): SQSClient {
  if (client) {
    return client;
  }

  client = new SQSClient({
    region: config.awsRegion,
  });

  return client;
}