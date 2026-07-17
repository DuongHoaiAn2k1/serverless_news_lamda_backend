import { RekognitionClient } from '@aws-sdk/client-rekognition';
import type { Config } from '@shared/config/index.js';

let client: RekognitionClient | null = null;

export function getRekognitionClient(config: Config): RekognitionClient {
  if (client) {
    return client;
  }

  client = new RekognitionClient({
    region: config.awsRegion,
  });

  return client;
}