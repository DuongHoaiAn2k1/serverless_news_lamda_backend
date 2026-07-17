/**
 * RSS Validation Tool
 *
 * Inspects raw RSS feed structure from 4 real-world sources.
 * Does NOT create Articles, write to DynamoDB, or send to SQS.
 *
 * Usage: npm run rss:test
 */
import Parser from 'rss-parser';
import { fetchFeed as normalizeFeed } from '../src/infrastructure/rss/rss-client.js';

interface TestSource {
  name: string;
  url: string;
  displayName: string;
}

const TEST_SOURCES: TestSource[] = [
  { name: 'AWS Blog', url: 'https://aws.amazon.com/blogs/aws/feed/', displayName: 'AWS' },
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', displayName: 'OpenAI' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', displayName: 'TechCrunch' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss.xml', displayName: 'Anthropic' },
];

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'BlogNews-Collector/1.0',
  },
});

interface SampleItem {
  title: string;
  summary: string;
  content: string;
  url: string;
  author: string;
  publishedAt: string | null;
  image: string;
  categories: string[];
}

interface SourceResult {
  name: string;
  displayName: string;
  feedTitle: string;
  itemCount: number;
  rawItemKeys: string[];
  fields: Record<string, boolean>;
  containsFullContent: boolean;
  contentLengths: number[];
  sampleItems: SampleItem[];
  mediaDebug: Record<string, unknown>;
}

function printSection(title: string, char = '='): void {
  console.log(`\n${char.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(char.repeat(70));
}

function printSubSection(title: string): void {
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('-'.repeat(60));
}

function truncate(str: string, max: number): string {
  if (!str) return '(empty)';
  return str.substring(0, max).replace(/\n/g, ' ');
}

function formatJson(val: unknown, max = 200): string {
  const json = JSON.stringify(val, null, 2);
  return json.length > max ? json.substring(0, max) + '...' : json;
}

async function inspectRawFeed(url: string): Promise<{
  rawItemKeys: string[];
  rawItems: any[];
  feedTitle: string;
}> {
  const feed = await parser.parseURL(url);
  const rawItems = feed.items ?? [];
  const rawItemKeys = rawItems.length > 0 ? Object.keys(rawItems[0]) : [];
  return { rawItemKeys, rawItems, feedTitle: feed.title ?? 'Unknown Feed' };
}

async function analyzeSource(source: TestSource): Promise<SourceResult> {
  printSection(`Source: ${source.name}`);
  console.log(`Feed URL: ${source.url}`);

  // --- Phase 1: Raw RSS structure ---
  console.log('\n[📡] Fetching raw RSS feed...');
  const { rawItemKeys, rawItems, feedTitle } = await inspectRawFeed(source.url);
  console.log(`Feed Title: ${feedTitle}`);
  console.log(`Number of items: ${rawItems.length}`);

  printSubSection('Raw RSS Item Keys');
  rawItemKeys.forEach((key, i) => console.log(`  ${String(i + 1).padEnd(3)} ${key}`));

  // --- Phase 2: Raw field details ---
  printSubSection('Raw Field Details (first item)');
  if (rawItems.length > 0) {
    const first = rawItems[0];
    const priorityKeys = [
      'title', 'contentSnippet', 'content:encoded', 'content', 'link',
      'pubDate', 'isoDate', 'creator', 'author', 'dc:creator',
      'enclosure', 'media:content', 'media:thumbnail', 'categories', 'guid',
    ];

    for (const key of priorityKeys) {
      if (key in first) {
        const val = (first as any)[key];
        const type = typeof val;
        let preview: string;
        if (type === 'string') {
          preview = `"${truncate(val, 120)}"`;
        } else {
          preview = formatJson(val, 140);
        }
        console.log(`  ${key.padEnd(22)} [${type.padEnd(6)}] ${preview}`);
      }
    }

    const extraKeys = rawItemKeys.filter((k) => !priorityKeys.includes(k));
    if (extraKeys.length > 0) {
      console.log('\n  Additional keys:');
      for (const key of extraKeys) {
        console.log(`  ${key.padEnd(22)} [${typeof (first as any)[key]}]`);
      }
    }
  }

  // --- Phase 3: Image debug ---
  printSubSection('Image Source Debug');
  if (rawItems.length > 0) {
    const first = rawItems[0];
    const imageFields = ['media:content', 'media:thumbnail', 'enclosure', 'media:group'];

    for (const field of imageFields) {
      if (field in first) {
        const val = (first as any)[field];
        console.log(`  ${field}:`);
        console.log(`    Type: ${typeof val}`);
        console.log(`    Value: ${formatJson(val, 400)}`);
      } else {
        console.log(`  ${field}: NOT PRESENT`);
      }
    }

    // Deep dive into media:content structure if available
    if (first['media:content']) {
      const mc = first['media:content'];
      console.log('\n  🔍 media:content structure:');
      if (typeof mc === 'object') {
        if (mc.$) {
          console.log(`    $.url:     ${mc.$.url ?? '(missing)'}`);
          console.log(`    $.width:   ${mc.$.width ?? '(missing)'}`);
          console.log(`    $.height:  ${mc.$.height ?? '(missing)'}`);
          console.log(`    $.type:    ${mc.$.type ?? '(missing)'}`);
          console.log(`    $.medium:  ${mc.$.medium ?? '(missing)'}`);
        } else {
          console.log(`    (no $ property): ${formatJson(mc, 200)}`);
        }
      }
    }

    if (first['media:thumbnail']) {
      const mt = first['media:thumbnail'];
      console.log('\n  🔍 media:thumbnail structure:');
      if (typeof mt === 'object') {
        if (mt.$) {
          console.log(`    $.url:     ${mt.$.url ?? '(missing)'}`);
          console.log(`    $.width:   ${mt.$.width ?? '(missing)'}`);
          console.log(`    $.height:  ${mt.$.height ?? '(missing)'}`);
        } else {
          console.log(`    (no $ property): ${formatJson(mt, 200)}`);
        }
      }
    }

    if (first.enclosure) {
      const enc = first.enclosure;
      console.log('\n  🔍 enclosure structure:');
      if (typeof enc === 'object') {
        console.log(`    url:  ${(enc as any).url ?? '(missing)'}`);
        console.log(`    type: ${(enc as any).type ?? '(missing)'}`);
        console.log(`    length: ${(enc as any).length ?? '(missing)'}`);
      }
    }
  }

  // --- Phase 4: Normalized output (first 3 items) ---
  printSubSection('Normalized Output (first 3 items)');
  const normalized = await normalizeFeed(source.url);

  const sampleItems: SampleItem[] = [];
  const contentLengths: number[] = [];

  for (let i = 0; i < Math.min(3, normalized.items.length); i++) {
    const item = normalized.items[i];
    contentLengths.push(item.content.length);

    console.log(`\n  --- Article ${i + 1} ---`);
    console.log(`  TITLE:           ${item.title}`);
    console.log(`  URL:             ${item.url}`);
    console.log(`  AUTHOR:          ${item.author || '(empty)'}`);
    console.log(`  PUBLISHED DATE:  ${item.publishedAt || '(empty)'}`);
    console.log(`  IMAGE:           ${item.image || '(empty)'}`);
    console.log(`  CONTENT LENGTH:  ${item.content.length} characters`);
    console.log(`  SUMMARY LENGTH:  ${item.summary.length} characters`);

    if (item.content) {
      console.log(`\n  CONTENT (300 chars):\n  ${item.content.substring(0, 300).replace(/\n/g, '\n  ')}`);
    } else {
      console.log('  CONTENT: (empty)');
    }

    if (item.summary) {
      console.log(`\n  SUMMARY (200 chars):\n  ${item.summary.substring(0, 200).replace(/\n/g, '\n  ')}`);
    } else {
      console.log('  SUMMARY: (empty)');
    }

    sampleItems.push({
      title: item.title,
      summary: item.summary,
      content: item.content,
      url: item.url,
      author: item.author,
      publishedAt: item.publishedAt,
      image: item.image,
      categories: [], // populated below from raw
    });
  }

  // --- Phase 5: Categories ---
  printSubSection('Categories');
  if (rawItems.length > 0) {
    const cats = (rawItems[0] as any).categories;
    if (cats && Array.isArray(cats) && cats.length > 0) {
      console.log(`  Categories available: ${cats.length}`);
      console.log(`  First 5: ${cats.slice(0, 5).join(', ')}`);
    } else {
      console.log('  Categories: NOT AVAILABLE or empty');
    }
  }

  // --- Phase 6: Content quality ---
  const avgContentLength =
    contentLengths.length > 0
      ? contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length
      : 0;
  const containsFullContent = avgContentLength > 1000;

  printSubSection('Content Quality Assessment');
  console.log(`  Average content length (first 3): ${Math.round(avgContentLength)} characters`);
  console.log(`  Threshold: > 1000 characters`);
  console.log(`  Verdict:   ${containsFullContent ? '✅ FULL ARTICLE' : '⚠️ SUMMARY ONLY'}`);

  // --- Phase 7: Field availability ---
  const fields: Record<string, boolean> = {
    title: normalized.items.some((i) => i.title.length > 0),
    summary: normalized.items.some((i) => i.summary.length > 0),
    content: normalized.items.some((i) => i.content.length > 0),
    author: normalized.items.some((i) => i.author.length > 0),
    image: normalized.items.some((i) => i.image.length > 0),
    publishedAt: normalized.items.some((i) => i.publishedAt !== null),
    categories: rawItems.length > 0 && Array.isArray((rawItems[0] as any).categories) && (rawItems[0] as any).categories.length > 0,
  };

  return {
    name: source.name,
    displayName: source.displayName,
    feedTitle,
    itemCount: normalized.items.length,
    rawItemKeys,
    fields,
    containsFullContent,
    contentLengths,
    sampleItems,
    mediaDebug: {},
  };
}

async function tryFetchSource(source: TestSource): Promise<TestSource> {
  // If primary fails, try fallback for Anthropic
  try {
    const feed = await parser.parseURL(source.url);
    if (feed.items && feed.items.length > 0) {
      return source; // works fine
    }
    throw new Error('No items');
  } catch {
    if (source.name === 'Anthropic News') {
      const fallback: TestSource = {
        name: 'NVIDIA Technical Blog',
        url: 'https://developer.nvidia.com/blog/feed/',
        displayName: 'NVIDIA',
      };
      console.log(`\n⚠️ Anthropic RSS unavailable. Falling back to: ${fallback.name}`);
      return fallback;
    }
    throw new Error(`Failed to fetch ${source.name} RSS`);
  }
}

function printComparisonTable(results: SourceResult[]): void {
  printSection('FINAL COMPARISON REPORT');

  const allFields = ['title', 'summary', 'content', 'author', 'image', 'categories', 'publishedAt'];
  const colWidth = 16;

  // Header
  let header = ''.padEnd(18);
  for (const r of results) {
    header += r.displayName.padEnd(colWidth);
  }
  console.log(header);
  console.log('─'.repeat(18 + colWidth * results.length));

  // Field rows
  for (const field of allFields) {
    let row = field.padEnd(18);
    for (const r of results) {
      row += (r.fields[field] ? '✅' : '❌').padEnd(colWidth);
    }
    console.log(row);
  }

  // Full content row
  let fcRow = 'Full Content'.padEnd(18);
  for (const r of results) {
    fcRow += (r.containsFullContent ? '✅' : '❌').padEnd(colWidth);
  }
  console.log('─'.repeat(18 + colWidth * results.length));
  console.log(fcRow);

  // Item count row
  let icRow = 'Item Count'.padEnd(18);
  for (const r of results) {
    icRow += String(r.itemCount).padEnd(colWidth);
  }
  console.log(icRow);
}

function printNextStepRecommendations(results: SourceResult[]): void {
  printSection('NEXT STEP RECOMMENDATIONS');

  for (const r of results) {
    console.log(`\n  ${r.displayName}`);
    console.log(`  ${'─'.repeat(40)}`);
    if (r.containsFullContent) {
      console.log(`  Strategy:   RSS_ONLY`);
      console.log(`  Reason:     RSS already contains full article`);
      console.log(`             (avg ${Math.round(r.contentLengths.reduce((a, b) => a + b, 0) / r.contentLengths.length)} chars)`);
    } else {
      console.log(`  Strategy:   RSS_PLUS_HTML_FETCH`);
      console.log(`  Reason:     RSS only contains excerpt`);
      console.log(`             (avg ${Math.round(r.contentLengths.reduce((a, b) => a + b, 0) / r.contentLengths.length)} chars)`);
    }
  }
}

function printContentFetcherDesign(): void {
  printSection('FUTURE MODULE DESIGN: ContentFetcher');

  console.log(`
  MODULE: content-fetcher (src/infrastructure/content-fetcher/)

  RESPONSIBILITIES
  ────────────────
  - Download article HTML from original URL
  - Extract readable content (strip navigation, ads, sidebars)
  - Extract hero image (Open Graph, Twitter Card, first <img>)
  - Extract clean HTML body
  - Return structured ContentResult

  INTERFACE
  ─────────

  interface ContentResult {
    html: string;            // Clean HTML body (no nav, ads, headers/footers)
    text: string;            // Plain text extracted from HTML
    heroImage: string;       // Best hero image URL found
    excerpt: string;         // First 160 chars of text (for meta description)
    wordCount: number;
    readingTimeMinutes: number;
  }

  interface ContentFetcher {
    fetchContent(url: string): Promise<ContentResult>;
  }

  IMPLEMENTATION OPTIONS
  ──────────────────────

  Option A: @extractus/article-extractor (recommended)
    - Lightweight, maintained, works in Node.js 22 ESM
    - Based on Mozilla's Readability algorithm
    - Extracts: content, title, description, image, author
    - Handles: Open Graph, Twitter Cards, JSON-LD
    - Handles: ads removal, navigation stripping

  Option B: cheerio + custom extraction
    - More control but more maintenance
    - Must handle each site's HTML structure variations

  INTEGRATION POINT
  ─────────────────

  In CollectorService.collectSource(), after fetching RSS:

    if (source.type === SourceType.RSS && !containsFullContent) {
      const contentResult = await contentFetcher.fetchContent(item.url);
      articleInput.original.content = contentResult.html;
      articleInput.original.image = contentResult.heroImage || articleInput.original.image;
    }

  This ensures all articles have full content before DynamoDB write.

  ERROR HANDLING
  ──────────────

  - If HTML fetch fails → keep RSS content as-is (graceful degradation)
  - Timeout: 10 seconds per fetch
  - Rate limit: 1 request per second per source domain
  - Cache: avoid re-fetching same URL within 24 hours

  DEPENDENCIES
  ────────────

  npm install @extractus/article-extractor
  `);
}

async function main() {
  console.log('='.repeat(70));
  console.log('  RSS FEED VALIDATION — 4 SOURCE COMPARISON');
  console.log('  Inspecting raw RSS structure from real-world feeds');
  console.log('='.repeat(70));

  const results: SourceResult[] = [];

  for (const rawSource of TEST_SOURCES) {
    try {
      const source = await tryFetchSource(rawSource);
      const result = await analyzeSource(source);
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`\n❌ Failed to analyze ${rawSource.name}: ${message}`);
    }
  }

  // Print final comparison table
  if (results.length >= 2) {
    printComparisonTable(results);
    printNextStepRecommendations(results);
    printContentFetcherDesign();
  } else {
    console.log('\n❌ Not enough results to generate comparison. Need at least 2 sources.');
    process.exit(1);
  }

  console.log('\n✅ RSS validation complete. No data was written to DynamoDB or SQS.');
}

main().catch((error) => {
  console.error('❌ RSS validation failed:', error);
  process.exit(1);
});