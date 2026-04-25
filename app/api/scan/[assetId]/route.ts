import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { db } from '@/lib/firebase-admin';
import { Asset, Violation, MatchType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Initialize Vision API client
const visionClient = new ImageAnnotatorClient();

/**
 * Trigger an internet scan for a specific asset.
 * Calls Google Cloud Vision Web Detection and saves results to Firestore.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_CRON_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch asset from Firestore
    const assetRef = db.collection('assets').doc(assetId);
    const assetDoc = await assetRef.get();

    if (!assetDoc.exists) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = assetDoc.data() as Asset;
    await assetRef.update({ scan_status: 'scanning', lastScannedAt: new Date() });

    if (!asset.storageUrl) {
      return NextResponse.json({ error: 'Asset has no storage URL' }, { status: 400 });
    }

    // 2. Call Google Cloud Vision API Web Detection
    const [result] = await visionClient.webDetection(asset.storageUrl);
    const webDetection = result.webDetection;

    if (!webDetection) {
      await assetRef.update({ scan_status: 'clean' });
      return NextResponse.json({ matchesFound: 0, message: 'No matches found' });
    }

    // 3. Process matches
    const violationsFound: Violation[] = [];
    
    const processMatchGroup = (urls: any[] | null | undefined, type: MatchType) => {
      if (!urls) return;
      urls.forEach((urlObj) => {
        if (!urlObj.url) return;
        violationsFound.push({
          violation_id: uuidv4(),
          owner_id: asset.owner_id || '', 
          asset_id: assetId,
          detected_at: new Date().toISOString(),
          match_url: urlObj.url,
          match_type: type,
          status: 'open',
          severity: 'LOW', 
          gemini_class: 'NEEDS_REVIEW'
        });
      });
    };

    processMatchGroup(webDetection.fullMatchingImages, 'full_match');
    processMatchGroup(webDetection.partialMatchingImages, 'partial_match');

    const pageMatches = webDetection.pagesWithMatchingImages || [];

    // 4. Save violations to Firestore & Trigger Classification
    const batch = db.batch();
    const classificationPromises: Promise<any>[] = [];

    violationsFound.forEach((violation) => {
      const page = pageMatches.find(p => 
        p.fullMatchingImages?.some(img => img.url === violation.match_url) || 
        p.partialMatchingImages?.some(img => img.url === violation.match_url)
      );
      
      if (page && page.pageTitle) {
        violation.page_context = page.pageTitle;
      }

      const violationRef = db.collection('violations').doc(violation.violation_id);
      batch.set(violationRef, violation);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      classificationPromises.push(
        fetch(`${appUrl}/api/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            violationId: violation.violation_id,
            matchUrl: violation.match_url,
            pageTitle: violation.page_context,
            pageDescription: page?.pageTitle ?? '', // Use title as description if not available
            assetRightsTier: asset.rights_tier,
            ownerOrg: asset.owner_org,
            matchType: violation.match_type,
            tags: asset.tags || [],
            originalAssetUrl: asset.storageUrl,
            violationImageUrl: violation.match_url, // Use match URL for visual check
            assetDescription: (asset as any).asset_description,
            assetCaptureDate: (asset as any).captured_at || (asset as any).uploaded_at,
            assetFirstPublishUrl: (asset as any).first_publish_url,
          }),
        }).catch(err => console.error(`Classification trigger failed for ${violation.violation_id}`, err))
      );
    });

    await batch.commit();
    await assetRef.update({ 
      scan_status: violationsFound.length > 0 ? 'violations_found' : 'clean' 
    });
    
    return NextResponse.json({
      matchesFound: violationsFound.length,
      assetId
    });

  } catch (error: any) {
    console.error('Scan pipeline error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
