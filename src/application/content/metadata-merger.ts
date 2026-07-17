import type { RssItem } from '@infrastructure/rss/rss-client.js';
import type { ContentResult } from '@infrastructure/content-fetcher/types.js';
import type { CreateArticleInput } from '@domain/article/index.js';
import type { Source } from '@domain/source/index.js';

export interface MergeMetadataInput {
  rssItem: RssItem;
  source: Source;
  fetchedContent: ContentResult | null;
}

export interface MergeMetadataLog {
  authorSource: 'RSS' | 'FETCHER' | 'SOURCE_DEFAULT';
  imageSource: 'RSS' | 'FETCHER' | 'NONE';
  contentSource: 'RSS' | 'FETCHER';
}

export class MetadataMerger {
  /**
   * Merges RSS metadata with optionally fetched HTML content.
   *
   * Rules:
   * - Title: prefer fetched, fallback RSS
   * - Summary: prefer RSS, fallback fetched excerpt
   * - Content: prefer fetched, fallback RSS
   * - Author: prefer fetched, fallback RSS, fallback Source.name
   * - PublishedAt: prefer fetched, fallback RSS
   * - Hero Image: prefer fetched, fallback RSS
   * - Categories: always RSS (not stored in Article currently)
   * - Original URL: always RSS
   */
  merge(input: MergeMetadataInput): { articleInput: CreateArticleInput; log: MergeMetadataLog } {
    const { rssItem, source, fetchedContent } = input;

    // Determine content source
    const useFetchedHtml = fetchedContent !== null && fetchedContent.html.length > 0;
    const content = useFetchedHtml ? fetchedContent!.html : rssItem.content;

    // Determine title
    const title = fetchedContent?.title && fetchedContent.title.length > 0
      ? fetchedContent.title
      : rssItem.title;

    // Determine summary: prefer RSS summary, fallback fetched excerpt, fallback truncated content
    const summary = rssItem.summary.length > 0
      ? rssItem.summary
      : fetchedContent?.excerpt ?? rssItem.summary;

    // Determine author
    let authorSource: MergeMetadataLog['authorSource'];
    let author: string;

    if (fetchedContent?.author && fetchedContent.author.length > 0) {
      author = fetchedContent.author;
      authorSource = 'FETCHER';
    } else if (rssItem.author.length > 0) {
      author = rssItem.author;
      authorSource = 'RSS';
    } else {
      author = source.name;
      authorSource = 'SOURCE_DEFAULT';
    }

    // Determine hero image
    let imageSource: MergeMetadataLog['imageSource'];
    let image: string;

    if (fetchedContent?.heroImage && fetchedContent.heroImage.length > 0) {
      image = fetchedContent.heroImage;
      imageSource = 'FETCHER';
    } else if (rssItem.image.length > 0) {
      image = rssItem.image;
      imageSource = 'RSS';
    } else {
      image = '';
      imageSource = 'NONE';
    }

    // Determine published date
    const publishedAt = fetchedContent?.publishedAt ?? rssItem.publishedAt;

    // Determine content source log
    const contentSource: MergeMetadataLog['contentSource'] = useFetchedHtml ? 'FETCHER' : 'RSS';

    const articleInput: CreateArticleInput = {
      sourceId: source.id,
      original: {
        title,
        summary,
        content,
        url: rssItem.url,
        publishedAt,
        image,
        author,
      },
      language: source.language,
      tags: [],
      author,
      coverImage: image,
    };

    const log: MergeMetadataLog = {
      authorSource,
      imageSource,
      contentSource,
    };

    return { articleInput, log };
  }
}