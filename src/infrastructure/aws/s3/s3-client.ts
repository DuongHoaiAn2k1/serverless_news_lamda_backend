import { S3Client } from '@aws-sdk/client-s3';
import type { Config } from '@shared/config/index.js';

let client: S3Client | null = null;

export function getS3Client(config: Config): S3Client {
  if (client) {
    return client;
  }

  client = new S3Client({
    region: config.awsRegion,
  });

  return client;
}