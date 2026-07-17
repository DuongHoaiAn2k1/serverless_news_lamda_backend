import type { ScheduledHandler } from 'aws-lambda';
import { ConsoleLogger } from '@shared/logger/index.js';
import { handleError } from '@shared/middleware/index.js';
import { loadConfig } from '@shared/config/index.js';
import { getDynamoDbClient } from '@infrastructure/aws/dynamodb/dynamodb-client.js';
import { getSqsClient } from '@infrastructure/aws/sqs/sqs-client.js';
import { DynamoDBSourceRepository } from '@infrastructure/repositories/dynamodb/dynamodb-source.repository.js';
import { DynamoDBArticleRepository } from '@infrastructure/repositories/dynamodb/dynamodb-article.repository.js';
import { SourceService } from '@application/services/source.service.js';
import { ArticleService } from '@application/services/article.service.js';
import { CollectorService } from '@application/services/collector.service.js';
import { ContentAnalyzer } from '@application/content/content-analyzer.js';
import { MetadataMerger } from '@application/content/metadata-merger.js';
import { ArticleExtractorContentFetcher } from '@infrastructure/content-fetcher/index.js';

const logger = new ConsoleLogger('INFO');

export const handler: ScheduledHandler = async () => {
  logger.info('CollectNewsHandler invoked');

  try {
    const config = loadConfig();
    const dynamoClient = getDynamoDbClient(config);
    const sqsClient = getSqsClient(config);

    const sourceRepository = new DynamoDBSourceRepository(dynamoClient, config.dynamoDbTable, logger);
    const articleRepository = new DynamoDBArticleRepository(dynamoClient, config.dynamoDbTable, logger);

    const sourceService = new SourceService(sourceRepository, logger);
    const articleService = new ArticleService(articleRepository, logger);

    const contentAnalyzer = new ContentAnalyzer();
    const metadataMerger = new MetadataMerger();
    const contentFetcher = new ArticleExtractorContentFetcher(logger);

    const collector = new CollectorService(
      sourceService,
      articleService,
      sqsClient,
      config.sqsQueueUrl,
      contentFetcher,
      contentAnalyzer,
      metadataMerger,
      logger,
    );

    const result = await collector.collect();

    logger.info('News collection completed', {
      collectedSources: result.collectedSources,
      articlesCreated: result.articlesCreated,
      failedSources: result.failedSources,
    });

    return;
  } catch (error) {
    handleError(error, logger);
    throw error;
  }
};