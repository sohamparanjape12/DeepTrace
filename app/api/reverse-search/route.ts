import { NextRequest, NextResponse } from 'next/server';

/**
 * Reverse image search via SerpAPI.
 * Accepts an image URL (Cloudinary) and returns visually similar images found on the web.
 */
export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 500 });
    }

    // Call SerpAPI Google Lens (much more accurate for exact visual matches than older reverse_image)
    const searchParams = new URLSearchParams({
      engine: 'google_lens',
      url: imageUrl,
      api_key: serpApiKey,
    });

    const serpResponse = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`);

    if (!serpResponse.ok) {
      const errorText = await serpResponse.text();
      console.error('SerpAPI error:', errorText);
      return NextResponse.json({ error: 'SerpAPI request failed', details: errorText }, { status: 502 });
    }

    const data = await serpResponse.json();

    // Extract the visual matches from Google Lens
    const imageResults = (data.visual_matches || []).map((result: any) => ({
      title: result.title || '',
      link: result.link || '',
      source: result.source || '',
      thumbnail: result.thumbnail || '',
      original: result.original || result.thumbnail || '',
    }));

    // Combine and deduplicate by link
    const seen = new Set<string>();
    const uniqueResults = imageResults.filter((r: any) => {
      if (!r.link || seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });

    return NextResponse.json({
      success: true,
      results: uniqueResults.slice(0, 20), // Cap at 20 results
      total: uniqueResults.length,
      searchMetadata: {
        searchUrl: data.search_metadata?.google_lens_url || data.search_metadata?.google_url,
        totalTimeTaken: data.search_metadata?.total_time_taken,
      },
    });

  } catch (error: any) {
    console.error('Reverse search error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
