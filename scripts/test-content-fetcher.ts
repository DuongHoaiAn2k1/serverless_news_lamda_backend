/**
 * ContentFetcher Validation Script
 *
 * Tests the ArticleExtractorContentFetcher against 4 real-world sources.
 * Does NOT create Articles, write to DynamoDB, or send to SQS.
 *
 * Usage: npm run content:test
 */
import { ArticleExtractorContentFetcher } from '../src/infrastructure/content-fetcher/index.js';
import { ConsoleLogger } from '../src/shared/logger/index.js';

const logger = new ConsoleLogger('INFO');
const fetcher = new ArticleExtractorContentFetcher(logger);

interface TestArticle {
  source: string;
  url: string;
}

const TEST_ARTICLES: TestArticle[] = [
  {
    source: 'AWS Blog',
    url: 'https://aws.amazon.com/blogs/aws/amazon-sqs-turns-20-two-decades-of-reliable-messaging-at-scale/',
  },
  {
    source: 'OpenAI News',
    url: 'https://openai.com/index/why-teens-deserve-access-safe-ai',
  },
  {
    source: 'TechCrunch AI',
    url: 'https://techcrunch.com/2026/07/16/google-vids-now-lets-you-star-in-your-own-ai-videos/',
  },
  {
    source: 'NVIDIA Technical Blog',
    url: 'https://developer.nvidia.com/blog/qa-how-capcom-brought-path-tracing-to-re-engine-across-pragmata-and-resident-evil-requiem/',
  },
];

interface TestResult {
  source: string;
  url: string;
  title: string;
  author: string;
  heroImage: string;
  publishedAt: string | null;
  wordCount: number;
  readingTimeMinutes: number;
  htmlLength: number;
  textLength: number;
  excerpt: string;
  success: boolean;
  error?: string;
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

async function testArticle(article: TestArticle): Promise<TestResult> {
  printSection(`Testing: ${article.source}`);
  console.log(`URL: ${article.url}`);

  try {
    const result = await fetcher.fetchContent(article.url);

    console.log(`\n  Title:              ${result.title}`);
    console.log(`  Author:             ${result.author || '(empty)'}`);
    console.log(`  Hero Image:         ${result.heroImage || '(empty)'}`);
    console.log(`  Published Date:     ${result.publishedAt || '(empty)'}`);
    console.log(`  Word Count:         ${result.wordCount}`);
    console.log(`  Reading Time:       ${result.readingTimeMinutes} min`);
    console.log(`  HTML Length:        ${result.html.length} characters`);
    console.log(`  Text Length:        ${result.text.length} characters`);
    console.log(`  Excerpt:            ${result.excerpt}`);

    printSubSection('Content Preview (first 500 chars of text)');
    console.log(`  ${result.text.substring(0, 500).replace(/\n/g, '\n  ')}`);

    return {
      source: article.source,
      url: article.url,
      title: result.title,
      author: result.author,
      heroImage: result.heroImage,
      publishedAt: result.publishedAt,
      wordCount: result.wordCount,
      readingTimeMinutes: result.readingTimeMinutes,
      htmlLength: result.html.length,
      textLength: result.text.length,
      excerpt: result.excerpt,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n  ❌ FAILED: ${message}`);

    return {
      source: article.source,
      url: article.url,
      title: '',
      author: '',
      heroImage: '',
      publishedAt: null,
      wordCount: 0,
      readingTimeMinutes: 0,
      htmlLength: 0,
      textLength: 0,
      excerpt: '',
      success: false,
      error: message,
    };
  }
}

function printQualityReport(results: TestResult[]): void {
  printSection('QUALITY REPORT');

  const colWidth = 18;

  // Header
  let header = ''.padEnd(18);
  for (const r of results) {
    header += r.source.padEnd(colWidth);
  }
  console.log(header);
  console.log('─'.repeat(18 + colWidth * results.length));

  // Rows
  const rows: Array<{ label: string; extract: (r: TestResult) => string }> = [
    { label: 'Status', extract: (r) => (r.success ? '✅' : '❌') },
    { label: 'Word Count', extract: (r) => String(r.wordCount) },
    { label: 'Reading Time', extract: (r) => `${r.readingTimeMinutes} min` },
    { label: 'HTML Length', extract: (r) => String(r.htmlLength) },
    { label: 'Text Length', extract: (r) => String(r.textLength) },
    { label: 'Hero Image', extract: (r) => (r.heroImage ? '✅' : '❌') },
    { label: 'Author', extract: (r) => (r.author ? '✅' : '❌') },
    { label: 'Published', extract: (r) => (r.publishedAt ? '✅' : '❌') },
  ];

  for (const row of rows) {
    let line = row.label.padEnd(18);
    for (const r of results) {
      line += row.extract(r).padEnd(colWidth);
    }
    console.log(line);
  }
}

function printImprovementSummary(results: TestResult[]): void {
  printSection('IMPROVEMENT OVER RSS');

  // RSS lengths from previous validation
  const rssLengths: Record<string, number> = {
    'AWS Blog': 11404,
    'OpenAI News': 153,
    'TechCrunch AI': 150,
    'NVIDIA Technical Blog': 3645,
  };

  console.log(`\n  ${'Source'.padEnd(20)} ${'RSS Len'.padEnd(10)} ${'Fetched Len'.padEnd(14)} ${'Improvement'.padEnd(12)} ${'Hero Image'.padEnd(14)} ${'Author'}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(10)} ${'─'.repeat(14)} ${'─'.repeat(12)} ${'─'.repeat(14)} ${'─'.repeat(10)}`);

  for (const r of results) {
    const rssLen = rssLengths[r.source] ?? 0;
    const fetchedLen = r.textLength;
    const improvement = rssLen > 0 ? ((fetchedLen - rssLen) / rssLen * 100).toFixed(0) : 'N/A';
    const improvementStr = r.success ? `${improvement}%` : 'FAILED';

    console.log(
      `  ${r.source.padEnd(20)} ${String(rssLen).padEnd(10)} ${String(fetchedLen).padEnd(14)} ${improvementStr.padEnd(12)} ${(r.heroImage ? '✅' : '❌').padEnd(14)} ${(r.author ? '✅' : '❌')}`,
    );
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('  CONTENT FETCHER VALIDATION');
  console.log('  Testing ArticleExtractorContentFetcher against 4 real-world sources');
  console.log('='.repeat(70));

  const results: TestResult[] = [];

  for (const article of TEST_ARTICLES) {
    const result = await testArticle(article);
    results.push(result);
  }

  printQualityReport(results);
  printImprovementSummary(results);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  RESULTS: ${successCount} succeeded, ${failCount} failed`);
  console.log('  No data was written to DynamoDB or SQS.');
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error('❌ Content fetcher validation failed:', error);
  process.exit(1);
});