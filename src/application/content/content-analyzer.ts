import type { RssItem } from '@infrastructure/rss/rss-client.js';

export interface ContentAnalysis {
  containsFullContent: boolean;
  reason: string;
}

const FULL_CONTENT_THRESHOLD = 1000;

export class ContentAnalyzer {
  /**
   * Analyzes whether an RSS item contains full article content or just an excerpt.
   *
   * Rules:
   * - If content:encoded exists (non-empty), it's full content
   * - If content length >= 1000, it's full content
   * - Otherwise, it's just a summary/truncated
   */
  analyze(item: RssItem): ContentAnalysis {
    if (item.content.length >= FULL_CONTENT_THRESHOLD) {
      return {
        containsFullContent: true,
        reason: `Content length ${item.content.length} >= ${FULL_CONTENT_THRESHOLD} characters`,
      };
    }

    return {
      containsFullContent: false,
      reason: `Content length ${item.content.length} < ${FULL_CONTENT_THRESHOLD} characters (truncated/excerpt only)`,
    };
  }
}