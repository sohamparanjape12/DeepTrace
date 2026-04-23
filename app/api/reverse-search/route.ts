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

    // Call SerpAPI Google Reverse Image Search
    const searchParams = new URLSearchParams({
      engine: 'google_reverse_image',
      image_url: imageUrl,
      api_key: serpApiKey,
    });

    const serpResponse = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`);

    if (!serpResponse.ok) {
      const errorText = await serpResponse.text();
      console.error('SerpAPI error:', errorText);
      return NextResponse.json({ error: 'SerpAPI request failed', details: errorText }, { status: 502 });
    }

    const data = await serpResponse.json();

    // Extract the image results — these are visually similar images
    const imageResults = (data.image_results || []).map((result: any) => ({
      title: result.title || '',
      link: result.link || '',
      source: result.source || '',
      thumbnail: result.thumbnail || '',
      original: result.original || result.thumbnail || '',
      size: result.original_width && result.original_height 
        ? `${result.original_width}×${result.original_height}` 
        : undefined,
    }));

    // Also extract inline images if available
    const inlineImages = (data.inline_images || []).map((result: any) => ({
      title: result.title || result.source || '',
      link: result.link || '',
      source: result.source || '',
      thumbnail: result.thumbnail || '',
      original: result.original || result.thumbnail || '',
    }));

    // Combine and deduplicate by link
    const allResults = [...imageResults, ...inlineImages];
    const seen = new Set<string>();
    const uniqueResults = allResults.filter(r => {
      if (!r.link || seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });

    return NextResponse.json({
      success: true,
      results: uniqueResults.slice(0, 20), // Cap at 20 results
      total: uniqueResults.length,
      searchMetadata: {
        searchUrl: data.search_metadata?.google_url,
        totalTimeTaken: data.search_metadata?.total_time_taken,
      },
    });

  } catch (error: any) {
    console.error('Reverse search error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
