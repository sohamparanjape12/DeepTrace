import { RetryableError, PermanentError } from './error-classes';

/**
 * Jina Reader API utility to scrape page context.
 * Returns title, description, and body text (capped at 3000 chars).
 */
export async function scrapePage(url: string): Promise<{ title: string; description: string; bodyText: string }> {
  const JINA_API_KEY = process.env.JINA_API_KEY;
  
  if (!JINA_API_KEY) {
    console.warn('JINA_API_KEY not found in environment. Skipping page scrape.');
    return { title: '', description: '', bodyText: '' };
  }

  console.log(`[Jina] Scraping URL: ${url}`);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body');
      console.error(`[Jina] Error ${response.status} for ${url}: ${errorBody}`);
      
      if (response.status === 400 || response.status === 429 || response.status >= 500) {
        throw new RetryableError(`Jina Reader API error: ${response.status}`);
      }
      throw new PermanentError(`Jina Reader API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract fields from Jina JSON response
    const title = data.data?.title || '';
    const description = data.data?.description || '';
    const content = data.data?.content || '';

    // Cap body text at 3000 characters
    const bodyText = content.substring(0, 3000);

    return { title, description, bodyText };
  } catch (error: any) {
    if (error instanceof RetryableError || error instanceof PermanentError) throw error;
    
    // Network errors are usually retryable
    if (error.name === 'AbortError' || error.message.includes('fetch failed')) {
      throw new RetryableError(error.message);
    }
    
    console.error(`Failed to scrape page ${url} with Jina:`, error);
    throw new RetryableError(error.message);
  }
}
