/**
 * Local execution script for CreateArticleHandler.
 * Runs the EXACT SAME Lambda handler used by AWS Lambda.
 */
import { handler } from '../src/handlers/admin/create-article.handler.js';

const event = {
  resource: '/admin/articles',
  path: '/admin/articles',
  httpMethod: 'POST',
  headers: {},
  queryStringParameters: null,
  pathParameters: null,
  body: JSON.stringify({
    sourceId: 'src_demo_aws_blog',
    original: {
      title: 'AWS Announces New Serverless Capabilities',
      summary: 'AWS has announced new serverless capabilities for Lambda functions.',
      content: 'Full article content here... AWS continues to innovate with serverless technology...',
      url: 'https://aws.amazon.com/blogs/aws/new-serverless-capabilities/',
      publishedAt: '2026-07-16T00:00:00.000Z',
      image: 'https://aws.amazon.com/blogs/media/featured-image.jpg',
      author: 'AWS Team',
    },
    language: 'en',
    tags: ['aws', 'serverless', 'lambda'],
    categoryId: 'cat_tech',
    author: 'AWS Team',
    coverImage: 'https://aws.amazon.com/blogs/media/cover.jpg',
  }),
  isBase64Encoded: false,
};

async function main() {
  process.env.APP_ENV = 'development';
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.DYNAMODB_TABLE = 'BlogNews';

  console.log('Running CreateArticleHandler locally...');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('CreateArticleHandler completed successfully');
}

main().catch((error) => {
  console.error('CreateArticleHandler failed:', error);
  process.exit(1);
});