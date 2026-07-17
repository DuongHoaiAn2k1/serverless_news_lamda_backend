export interface Config {
  awsRegion: string;
  dynamoDbTable: string;
  s3Bucket: string;
  sqsQueueUrl: string;
  bedrockModelId: string;
  telegramBotToken: string;
  appEnv: string;
  logLevel: string;
}

export function loadConfig(): Config {
  return {
    awsRegion: process.env.AWS_REGION ?? 'ap-southeast-1',
    dynamoDbTable: process.env.DYNAMODB_TABLE ?? 'BlogNews',
    s3Bucket: process.env.S3_BUCKET ?? 'blognews-media',
    sqsQueueUrl: process.env.SQS_QUEUE_URL ?? '',
    bedrockModelId: process.env.BEDROCK_MODEL ?? 'anthropic.claude-3-sonnet-20240229-v1:0',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    appEnv: process.env.APP_ENV ?? 'development',
    logLevel: process.env.LOG_LEVEL ?? 'INFO',
  };
}