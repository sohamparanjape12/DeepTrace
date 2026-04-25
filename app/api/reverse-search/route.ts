import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { violationIdempotencyKey, setAssetStage, setViolationStage } from '@/lib/stage';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Reverse image search via SerpAPI.
 * Accepts an image URL (Cloudinary) and returns visually similar images found on the web.
 */
export async function POST(req: NextRequest) {
  try {
    const { imageUrl, assetId, userId } = await req.json();

    if (!imageUrl || !assetId || !userId) {
      return NextResponse.json({ error: 'Missing required fields (imageUrl, assetId, userId)' }, { status: 400 });
    }

    // 1. Check idempotency
    const assetRef = db.collection('assets').doc(assetId);
    const assetSnap = await assetRef.get();
    if (assetSnap.exists) {
      const assetData = assetSnap.data();
      if (assetData?.idempotency?.reverse_search_done) {
        return NextResponse.json({ 
          success: true, 
          results: [], 
          total: assetData.totals?.reverse_hits || 0,
          message: 'Already searched'
        });
      }
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
    }).slice(0, 20); // Cap at 20

    const assetName = assetSnap.data()?.name || 'Unknown Asset';

    // 2. Create violations with deterministic IDs
    for (const match of uniqueResults) {
      const vid = violationIdempotencyKey(assetId, match.link);
      const vRef = db.collection('violations').doc(vid);
      const vSnap = await vRef.get();
      
      const violationData: any = {
        violation_id: vid,
        owner_id: userId,
        asset_id: assetId,
        asset_name: assetName, // Denormalize for dashboard speed
        detected_at: new Date().toISOString(),
        match_url: match.link,
        match_type: 'visually_similar',
        status: 'open',
        severity: 'PENDING',
        gemini_class: 'ANALYZING',
        page_context: match.title || '',
        assetThumbnailUrl: match.original || match.thumbnail || '',
        match_image_url: match.original || match.thumbnail || '',
        idempotency_key: vid,
      };

      // ONLY set stage if it doesn't exist or is missing
      if (!vSnap.exists || !vSnap.data()?.stage) {
        violationData.stage = 'gated_pending';
        violationData.stage_updated_at = FieldValue.serverTimestamp();
        violationData.attempts = { gate: 0, scrape: 0, classify: 0 };
      }

      await vRef.set(violationData, { merge: true });
    }

    // 3. Update asset stage
    await setAssetStage(assetId, 'reverse_searched', {
      'idempotency.reverse_search_done': true,
      'totals.reverse_hits': uniqueResults.length,
      'totals.gated_pending': uniqueResults.length,
    });

    return NextResponse.json({
      success: true,
      results: uniqueResults,
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
