/**
 * Collector Pipeline Test Script
 *
 * Tests the full pipeline: RSS → Normalize → Analyze → Fetch → Merge → Create → SQS
 * Does NOT write to DynamoDB or send SQS (uses a mock ArticleService).
 *
 * Usage: npm run collect:pipeline:test
 */
import { fetchFeed, type RssItem } from '../src/infrastructure/rss/rss-client.js';
import type { Source } from '../src/domain/source/index.js';
import { SourceType, SourceStatus, FetchStrategy } from '../src/domain/source/index.js';
import { ArticleExtractorContentFetcher } from '../src/infrastructure/content-fetcher/index.js';
import { ContentAnalyzer } from '../src/application/content/content-analyzer.js';
import { MetadataMerger } from '../src/application/content/metadata-merger.js';
import { ConsoleLogger } from '../src/shared/logger/index.js';
import type { Logger } from '../src/shared/logger/index.js';

// Silenced logger for test output
const logger = new ConsoleLogger('INFO');
const contentAnalyzer = new ContentAnalyzer();
const metadataMerger = new MetadataMerger();
const contentFetcher = new ArticleExtractorContentFetcher(logger);

interface TestSource {
  name: string;
  url: string;
  displayName: string;
  expectedStrategy: 'RSS_ONLY' | 'RSS_PLUS_HTML_FETCH';
  expectedHtmlFetch: boolean;
}

const TEST_SOURCES: TestSource[] = [
  {
    name: 'AWS Blog',
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    displayName: 'AWS',
    expectedStrategy: 'RSS_ONLY',
    expectedHtmlFetch: false,
  },
  {
    name: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml',
    displayName: 'OpenAI',
    expectedStrategy: 'RSS_PLUS_HTML_FETCH',
    expectedHtmlFetch: true,
  },
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    displayName: 'TechCrunch',
    expectedStrategy: 'RSS_PLUS_HTML_FETCH',
    expectedHtmlFetch: true,
  },
  {
    name: 'NVIDIA Technical Blog',
    url: 'https://developer.nvidia.com/blog/feed/',
    displayName: 'NVIDIA',
    expectedStrategy: 'RSS_ONLY',
    expectedHtmlFetch: false,
  },
];

interface PipelineResult {
  source: string;
  strategy: string;
  didFetchHtml: boolean;
  rssLength: number;
  fetchedLength: number;
  finalContentLength: number;
  finalSummaryLength: number;
  author: string;
  authorSource: string;
  heroImage: string;
  imageSource: string;
  categories: string[];
  matchedStrategy: boolean;
  matchedHtmlFetch: boolean;
}

function printSection(title: string): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function printSubSection(title: string): void {
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('-'.repeat(60));
}

function buildMockSource(testSource: TestSource): Source {
  return {
    id: `src_${testSource.displayName.toLowerCase().replace(/\s+/g, '_')}`,
    name: testSource.name,
    type: SourceType.RSS,
    url: testSource.url,
    status: SourceStatus.ACTIVE,
    priority: 10,
    fetchInterval: 60,
    language: 'en',
    description: '',
    fetchStrategy: FetchStrategy.AUTO,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

async function testPipeline(testSource: TestSource): Promise<PipelineResult> {
  printSection(`Pipeline: ${testSource.name}`);
  console.log(`Feed URL: ${testSource.url}`);

  // Step 1: RSS
  console.log('\n[1] 📡 FETCH RSS');
  const feed = await fetchFeed(testSource.url);
  console.log(`  Feed: ${feed.feedTitle} (${feed.items.length} items)`);

  if (feed.items.length === 0) {
    return {
      source: testSource.displayName,
      strategy: 'N/A',
      didFetchHtml: false,
      rssLength: 0,
      fetchedLength: 0,
      finalContentLength: 0,
      finalSummaryLength: 0,
      author: '',
      authorSource: 'N/A',
      heroImage: '',
      imageSource: 'N/A',
      categories: [],
      matchedStrategy: false,
      matchedHtmlFetch: false,
    };
  }

  const firstItem = feed.items[0];
  const source = buildMockSource(testSource);

  printSubSection('First Article (RSS)');
  console.log(`  Title:      ${firstItem.title}`);
  console.log(`  URL:        ${firstItem.url}`);
  console.log(`  Author:     ${firstItem.author || '(empty)'}`);
  console.log(`  Image:      ${firstItem.image || '(empty)'}`);
  console.log(`  RSS Length: ${firstItem.content.length} chars`);

  // Step 2: Analyze
  console.log('\n[2] 🔍 ANALYZE');
  const analysis = contentAnalyzer.analyze(firstItem);
  console.log(`  Full Content: ${analysis.containsFullContent}`);
  console.log(`  Reason:       ${analysis.reason}`);

  // Step 3: Determine strategy
  const strategy = analysis.containsFullContent ? 'RSS_ONLY' : 'RSS_PLUS_HTML_FETCH';
  console.log(`\n[3] 📋 STRATEGY: ${strategy}`);

  // Step 4: Fetch HTML
  console.log('\n[4] 🌐 HTML FETCH');
  let fetchedContent = null;
  let didFetchHtml = false;

  if (!analysis.containsFullContent) {
    didFetchHtml = true;
    try {
      fetchedContent = await contentFetcher.fetchContent(firstItem.url);
      console.log(`  ✅ Success`);
      console.log(`  Title:      ${fetchedContent.title}`);
      console.log(`  Author:     ${fetchedContent.author || '(empty)'}`);
      console.log(`  Hero Image: ${fetchedContent.heroImage || '(empty)'}`);
      console.log(`  Fetched Len: ${fetchedContent.html.length} chars`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ⚠️ Failed: ${message} (using RSS content)`);
    }
  } else {
    console.log('  ⏭️ Skipped (RSS has full content)');
  }

  // Step 5: Merge
  console.log('\n[5] 🔀 MERGE METADATA');
  const { articleInput, log } = metadataMerger.merge({
    rssItem: firstItem,
    source,
    fetchedContent,
  });

  console.log(`  Content Source:  ${log.contentSource}`);
  console.log(`  Author Source:   ${log.authorSource}`);
  console.log(`  Image Source:    ${log.imageSource}`);
  console.log(`  Final Author:    ${articleInput.original.author}`);
  console.log(`  Final Image:     ${articleInput.original.image || '(empty)'}`);
  console.log(`  Final Content:   ${articleInput.original.content.length} chars`);
  console.log(`  Final Summary:   ${articleInput.original.summary.length} chars`);

  // Step 6: Categories (from raw RSS)
  const parser = new (await import('rss-parser')).default();
  const rawFeed = await parser.parseURL(testSource.url);
  const categories = rawFeed.items.length > 0
    ? (rawFeed.items[0] as any).categories ?? []
    : [];

  console.log(`\n  Categories: ${categories.length > 0 ? categories.slice(0, 5).join(', ') : '(none)'}`);

  printSubSection('Final Article Input');
  console.log(`  Title:      ${articleInput.original.title}`);
  console.log(`  Author:     ${articleInput.original.author}`);
  console.log(`  Image:      ${articleInput.original.image || '(empty)'}`);
  console.log(`  URL:        ${articleInput.original.url}`);
  console.log(`  Content:    ${articleInput.original.content.substring(0, 200).replace(/\n/g, '\n  ')}...`);

  const matchedStrategy = strategy === testSource.expectedStrategy;
  const matchedHtmlFetch = didFetchHtml === testSource.expectedHtmlFetch;

  console.log(`\n  ✅ Expected Strategy: ${testSource.expectedStrategy} → ${matchedStrategy ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  ✅ Expected HTML Fetch: ${testSource.expectedHtmlFetch} → ${matchedHtmlFetch ? 'MATCH' : 'MISMATCH'}`);

  return {
    source: testSource.displayName,
    strategy,
    didFetchHtml,
    rssLength: firstItem.content.length,
    fetchedLength: fetchedContent?.html.length ?? 0,
    finalContentLength: articleInput.original.content.length,
    finalSummaryLength: articleInput.original.summary.length,
    author: articleInput.original.author,
    authorSource: log.authorSource,
    heroImage: articleInput.original.image,
    imageSource: log.imageSource,
    categories,
    matchedStrategy,
    matchedHtmlFetch,
  };
}

function printQualityReport(results: PipelineResult[]): void {
  printSection('PIPELINE QUALITY REPORT');

  const colWidth = 16;

  let header = ''.padEnd(18);
  for (const r of results) {
    header += r.source.padEnd(colWidth);
  }
  console.log(header);
  console.log('─'.repeat(18 + colWidth * results.length));

  const rows: Array<{ label: string; extract: (r: PipelineResult) => string }> = [
    { label: 'Strategy', extract: (r) => r.strategy.padEnd(colWidth) },
    { label: 'HTML Fetch', extract: (r) => (r.didFetchHtml ? 'YES' : 'NO').padEnd(colWidth) },
    { label: 'RSS Length', extract: (r) => String(r.rssLength).padEnd(colWidth) },
    { label: 'Fetched Length', extract: (r) => String(r.fetchedLength).padEnd(colWidth) },
    { label: 'Final Length', extract: (r) => String(r.finalContentLength).padEnd(colWidth) },
    { label: 'Author', extract: (r) => (r.author || '(empty)').padEnd(colWidth) },
    { label: 'Author Source', extract: (r) => r.authorSource.padEnd(colWidth) },
    { label: 'Hero Image', extract: (r) => (r.heroImage ? '✅' : '❌').padEnd(colWidth) },
    { label: 'Image Source', extract: (r) => r.imageSource.padEnd(colWidth) },
    { label: 'Categories', extract: (r) => (r.categories.length > 0 ? '✅' : '❌').padEnd(colWidth) },
    { label: 'Strategy Match', extract: (r) => (r.matchedStrategy ? '✅' : '❌').padEnd(colWidth) },
    { label: 'Fetch Match', extract: (r) => (r.matchedHtmlFetch ? '✅' : '❌').padEnd(colWidth) },
  ];

  for (const row of rows) {
    let line = row.label.padEnd(18);
    for (const r of results) {
      line += row.extract(r);
    }
    console.log(line);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('  COLLECTOR PIPELINE TEST');
  console.log('  RSS → Normalize → Analyze → Fetch → Merge → Create');
  console.log('='.repeat(70));

  const results: PipelineResult[] = [];

  for (const ts of TEST_SOURCES) {
    try {
      const result = await testPipeline(ts);
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`\n❌ Pipeline test failed for ${ts.name}: ${message}`);
    }
  }

  if (results.length > 0) {
    printQualityReport(results);

    const allStrategyMatch = results.every((r) => r.matchedStrategy);
    const allFetchMatch = results.every((r) => r.matchedHtmlFetch);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  STRATEGY MATCH: ${allStrategyMatch ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
    console.log(`  FETCH MATCH:    ${allFetchMatch ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
    console.log('  No data was written to DynamoDB or SQS.');
    console.log('='.repeat(70));
  }
}

main().catch((error) => {
  console.error('❌ Pipeline test failed:', error);
  process.exit(1);
});