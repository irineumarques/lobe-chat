/**
 * MouseAI Web Search Service
 * Combines Serper (web search) and Firecrawl (web scraping) into a unified API.
 */

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  date?: string;
}

interface ScrapeResult {
  content: string;
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    publishedDate?: string;
    language?: string;
    statusCode: number;
    url: string;
  };
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
}

interface ScrapeResponse {
  success: boolean;
  url: string;
  content: ScrapeResult;
}

// Serper API - Web Search
async function serperSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

  const data = await response.json() as {
    organic?: Array<{
      title?: string;
      snippet?: string;
      link?: string;
      date?: string;
    }>;
  };

  return (data.organic || []).map((item) => ({
    title: item.title || '',
    snippet: item.snippet || '',
    url: item.link || '',
    date: item.date,
  }));
}

// Firecrawl API - Web Scraping
async function firecrawlScrape(url: string, apiKey: string): Promise<ScrapeResult> {
  const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      pageOptions: { onlyMainContent: true },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status}`);
  }

  const data = await response.json() as {
    data?: {
      content?: string;
      markdown?: string;
      metadata?: {
        title?: string;
        description?: string;
        author?: string;
        publishedDate?: string;
        language?: string;
      };
    };
    status?: string;
  };

  return {
    content: data.data?.content || '',
    markdown: data.data?.markdown || '',
    metadata: {
      title: data.data?.metadata?.title,
      description: data.data?.metadata?.description,
      author: data.data?.metadata?.author,
      publishedDate: data.data?.metadata?.publishedDate,
      language: data.data?.metadata?.language,
      statusCode: response.status,
      url,
    },
  };
}

export { serperSearch, firecrawlScrape };
export type { SearchResult, ScrapeResult, SearchResponse, ScrapeResponse };