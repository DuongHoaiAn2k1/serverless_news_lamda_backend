import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { Config } from '@shared/config/index.js';

let client: BedrockRuntimeClient | null = null;

export function getBedrockClient(config: Config): BedrockRuntimeClient {
  if (client) {
    return client;
  }

  client = new BedrockRuntimeClient({
    region: config.awsRegion,
  });

  return client;
}