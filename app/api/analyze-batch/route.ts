import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { enqueueAsset } from '@/lib/qstash';
import { v4 as uuidv4 } from 'uuid';

/**
 * Trigger background batch forensic analysis.
 * Uses the v2 pipeline with adaptive weighting and reliability scoring.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      assetId, 
      userId,
      uploadedUrl, 
      rightsTier, 
      ownerOrg, 
      selectedTags, 
      assetDescription, 
      matchesToAnalyze 
    } = body;

    if (!assetId || !matchesToAnalyze || !Array.isArray(matchesToAnalyze)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store initial placeholders in Firestore
    for (const match of matchesToAnalyze) {
      try {
        const violationId = uuidv4();
        await db.collection('violations').doc(violationId).set({
          violation_id: violationId,
          owner_id: userId,
          asset_id: assetId,
          detected_at: new Date().toISOString(),
          match_url: match.link,
          match_type: 'visually_similar',
          status: 'open',
          severity: 'PENDING',
          gemini_class: 'ANALYZING',
          page_context: match.title || '',
          assetThumbnailUrl: match.original || match.thumbnail || '',
        });
      } catch (e) {
        console.error(`Error saving placeholder for ${match.link}:`, e);
      }
    }

    // Enqueue the background processing job via QStash
    await enqueueAsset({ assetId, userId, uploadedUrl, rightsTier, ownerOrg, selectedTags, assetDescription });

    return NextResponse.json({ success: true, message: 'Asset queued for processing' });
  } catch (error: any) {
    console.error('Batch enqueue error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

