import { extract } from '@extractus/article-extractor';
import type { ContentResult, IContentFetcher } from './types.js';
import { ContentFetchError } from '@shared/errors/content-fetch-error.js';
import type { Logger } from '@shared/logger/index.js';

const EXCERPT_LENGTH = 160;
const WORDS_PER_MINUTE = 200;

function calculateWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function calculateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

function extractExcerpt(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.substring(0, EXCERPT_LENGTH).trim();
}

function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ArticleExtractorContentFetcher implements IContentFetcher {
  constructor(private readonly logger: Logger) {}

  async fetchContent(url: string): Promise<ContentResult> {
    this.logger.info('Fetching article content', { url });

    try {
      const article = await extract(url, {
        descriptionTruncateLen: EXCERPT_LENGTH,
      });

      if (!article) {
        throw new ContentFetchError('Article extraction returned empty result', url);
      }

      const html = article.content ?? '';
      const text = stripHtml(html);
      const wordCount = calculateWordCount(text);
      const readingTimeMinutes = calculateReadingTime(wordCount);
      const excerpt = article.description ?? extractExcerpt(text);
      const publishedAt = toIsoDate(article.published);

      this.logger.info('Article fetched successfully', {
        url,
        title: article.title,
        wordCount,
        readingTimeMinutes,
        hasHeroImage: !!article.image,
      });

      return {
        title: article.title ?? '',
        html,
        text,
        excerpt,
        heroImage: article.image ?? '',
        author: article.author ?? '',
        publishedAt,
        wordCount,
        readingTimeMinutes,
      };
    } catch (error) {
      if (error instanceof ContentFetchError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Article fetch failed', { url, error: message });
      throw new ContentFetchError(`Failed to fetch content: ${message}`, url);
    }
  }
}