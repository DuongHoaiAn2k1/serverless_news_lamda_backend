import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Config } from '@shared/config/index.js';

let client: DynamoDBDocumentClient | null = null;

export function getDynamoDbClient(config: Config): DynamoDBDocumentClient {
  if (client) {
    return client;
  }

  const dynamoClient = new DynamoDBClient({
    region: config.awsRegion,
  });

  client = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
  });

  return client;
}