export interface ContentResult {
  title: string;
  html: string;
  text: string;
  excerpt: string;
  heroImage: string;
  author: string;
  publishedAt: string | null;
  wordCount: number;
  readingTimeMinutes: number;
}

export interface IContentFetcher {
  fetchContent(url: string): Promise<ContentResult>;
}