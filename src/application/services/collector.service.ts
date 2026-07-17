
import type { Source } from '@domain/source/index.js';
import { SourceType, FetchStrategy } from '@domain/source/index.js';
import { fetchFeed, type RssItem } from '@infrastructure/rss/rss-client.js';
import type { IContentFetcher } from '@infrastructure/content-fetcher/types.js';
import { ContentAnalyzer } from '@application/content/content-analyzer.js';
import { MetadataMerger } from '@application/content/metadata-merger.js';
import type { SourceService } from './source.service.js';
import type { ArticleService } from './article.service.js';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import type { SQSClient } from '@aws-sdk/client-sqs';
import type { Logger } from '@shared/logger/index.js';

export interface CollectorResult {
  collectedSources: number;
  articlesCreated: number;
  failedSources: number;
  errors: string[];
}

interface ArticleCollectLog {
  title: string;
  strategy: FetchStrategy;
  didFetchHtml: boolean;
  rssContentLength: number;
  fetchedContentLength: number;
  authorSource: string;
  imageSource: string;
  contentSource: string;
}

export class CollectorService {
  constructor(
    private readonly sourceService: SourceService,
    private readonly articleService: ArticleService,
    private readonly sqsClient: SQSClient,
    private readonly sqsQueueUrl: string,
    private readonly contentFetcher: IContentFetcher,
    private readonly contentAnalyzer: ContentAnalyzer,
    private readonly metadataMerger: MetadataMerger,
    private readonly logger: Logger,
  ) {}

  async collect(): Promise<CollectorResult> {
    this.logger.info('Collector started');

    const result: CollectorResult = {
      collectedSources: 0,
      articlesCreated: 0,
      failedSources: 0,
      errors: [],
    };

    const sources = await this.sourceService.findActive();
    this.logger.info('Active sources loaded', { count: sources.length });

    for (const source of sources) {
      try {
        await this.collectSource(source, result);
        result.collectedSources++;
      } catch (error) {
        result.failedSources++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Source ${source.id} (${source.name}): ${message}`);
        this.logger.error('Source collection failed', { sourceId: source.id, sourceName: source.name, error: message });
      }
    }

    this.logger.info('Collector completed', {
      collectedSources: result.collectedSources,
      articlesCreated: result.articlesCreated,
      failedSources: result.failedSources,
    });

    return result;
  }

  private async collectSource(source: Source, result: CollectorResult): Promise<void> {
    this.logger.info('Fetching source', { sourceId: source.id, sourceName: source.name, url: source.url });

    if (source.type !== SourceType.RSS) {
      this.logger.warn('Non-RSS source skipped', { sourceId: source.id, sourceName: source.name, type: source.type });
      return;
    }

    const feed = await fetchFeed(source.url);
    this.logger.info('RSS parsed', { sourceName: source.name, feedTitle: feed.feedTitle, itemCount: feed.items.length });

    for (const item of feed.items) {
      try {
        await this.collectArticle(item, source, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Item "${item.title}": ${message}`);
        this.logger.error('Article collection failed', { title: item.title, error: message });
      }
    }
  }

  private async collectArticle(item: RssItem, source: Source, result: CollectorResult): Promise<void> {
    // Step 1: Determine fetch strategy
    const strategy = this.determineStrategy(source, item);
    const rssContentLength = item.content.length;

    // Step 2: Optionally fetch HTML content
    let fetchedContent = null;
    let didFetchHtml = false;

    if (strategy === FetchStrategy.RSS_PLUS_HTML_FETCH) {
      didFetchHtml = true;
      try {
        fetchedContent = await this.contentFetcher.fetchContent(item.url);
        this.logger.info('HTML fetch succeeded', { url: item.url, title: item.title });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn('HTML fetch failed, using RSS content', { url: item.url, error: message });
      }
    } else if (strategy === FetchStrategy.AUTO) {
      const analysis = this.contentAnalyzer.analyze(item);
      if (!analysis.containsFullContent) {
        didFetchHtml = true;
        try {
          fetchedContent = await this.contentFetcher.fetchContent(item.url);
          this.logger.info('HTML fetch succeeded (AUTO)', { url: item.url, title: item.title });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn('HTML fetch failed, using RSS content (AUTO)', { url: item.url, error: message });
        }
      }
    }

    // Step 3: Merge metadata
    const { articleInput, log } = this.metadataMerger.merge({
      rssItem: item,
      source,
      fetchedContent,
    });

    // Step 4: Log collection details
    const fetchedContentLength = fetchedContent?.html.length ?? 0;
    this.logArticleCollectLog({
      title: item.title,
      strategy,
      didFetchHtml,
      rssContentLength,
      fetchedContentLength,
      authorSource: log.authorSource,
      imageSource: log.imageSource,
      contentSource: log.contentSource,
    });

    // Step 5: Create article
    const article = await this.articleService.create(articleInput);
    result.articlesCreated++;

    this.logger.info('Article created', { articleId: article.id, title: item.title });

    // Step 6: Send to SQS
    await this.sendToQueue(article.id);
    this.logger.info('SQS message sent', { articleId: article.id });
  }

  private determineStrategy(source: Source, item: RssItem): FetchStrategy {
    if (source.fetchStrategy && source.fetchStrategy !== FetchStrategy.AUTO) {
      return source.fetchStrategy;
    }

    const analysis = this.contentAnalyzer.analyze(item);
    return analysis.containsFullContent ? FetchStrategy.RSS_ONLY : FetchStrategy.RSS_PLUS_HTML_FETCH;
  }

  private logArticleCollectLog(log: ArticleCollectLog): void {
    this.logger.info('Article collection details', {
      title: log.title,
      strategy: log.strategy,
      htmlFetch: log.didFetchHtml ? 'YES' : 'NO',
      rssLength: log.rssContentLength,
      fetchedLength: log.fetchedContentLength,
      authorSource: log.authorSource,
      imageSource: log.imageSource,
      contentSource: log.contentSource,
    });
  }

  private async sendToQueue(articleId: string): Promise<void> {
    if (!this.sqsQueueUrl) {
      this.logger.warn('SQS queue URL not configured, skipping message send');
      return;
    }

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.sqsQueueUrl,
        MessageBody: JSON.stringify({ articleId }),
      }),
    );
  }
}