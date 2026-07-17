import Parser from 'rss-parser';

export interface RssItem {
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: string | null;
  author: string;
  image: string;
}

export interface RssFeedResult {
  items: RssItem[];
  feedTitle: string;
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'BlogNews-Collector/1.0',
  },
});

export async function fetchFeed(url: string): Promise<RssFeedResult> {
  const feed = await parser.parseURL(url);

  const items: RssItem[] = (feed.items ?? []).map((item) => ({
    title: item.title ?? '',
    summary: item.contentSnippet ?? item.content ?? '',
    content: item['content:encoded'] ?? item.content ?? item.contentSnippet ?? '',
    url: item.link ?? '',
    publishedAt: item.isoDate ?? item.pubDate ?? null,
    author: item.creator ?? item.author ?? '',
    image: extractImage(item),
  }));

  return {
    items,
    feedTitle: feed.title ?? 'Unknown Feed',
  };
}

function extractImage(item: any): string {
  // Try standard media:content
  if (item['media:content']?.$.url) {
    return item['media:content'].$.url;
  }

  // Try media:thumbnail
  if (item['media:thumbnail']?.$.url) {
    return item['media:thumbnail'].$.url;
  }

  // Try enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  return '';
}