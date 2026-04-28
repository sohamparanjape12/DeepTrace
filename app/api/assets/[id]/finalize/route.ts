import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { setAssetStage, violationIdempotencyKey } from '@/lib/stage';
import { getBaseUrl } from '@/lib/utils/url';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params;
  
  try {
    const { 
      name, 
      ownerOrg, 
      rightsTier, 
      selectedTags, 
      assetDescription,
      selectedMatchUrls 
    } = await req.json();

    if (!assetId) return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });

    const assetRef = db.collection('assets').doc(assetId);
    const assetSnap = await assetRef.get();
    
    if (!assetSnap.exists) {
      return NextResponse.json({ 
        error: 'Asset session expired or deleted. Please restart the upload.' 
      }, { status: 404 });
    }
    
    // 1. Update Asset Metadata & Reset Totals for Selected Sub-set
    await assetRef.update({
      name,
      owner_org: ownerOrg,
      rights_tier: rightsTier,
      tags: selectedTags,
      asset_description: assetDescription,
      scan_status: 'scanning',
      stage: 'analyzing', // Move to analyzing stage
      totals: {
        reverse_hits: selectedMatchUrls.length,
        gated_pending: selectedMatchUrls.length,
        gate_passed: 0,
        gate_dropped: 0,
        scraped: 0,
        classified: 0,
        failed_retryable: 0,
        failed_permanent: 0,
      }
    });

    // 2. Filter Violations
    // Any violation for this asset that is NOT in the selected list should be marked as 'ignored'
    const violationsSnap = await db.collection('violations')
      .where('asset_id', '==', assetId)
      .get();

    const batch = db.batch();
    const selectedSet = new Set(selectedMatchUrls);

    violationsSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!selectedSet.has(data.match_url)) {
        batch.update(doc.ref, { stage: 'ignored' });
      }
    });

    await batch.commit();

    // 3. Trigger Resume (which will now skip 'ignored' items)
    const baseUrl = getBaseUrl();
    // We don't wait for this, just fire and forget or call the logic directly
    fetch(`${baseUrl}/api/resume/${assetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    }).catch(err => console.error('[Finalize] Resume trigger failed:', err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Finalize API] Error:', error);
    require('fs').writeFileSync('finalize_error.log', String(error.stack || error.message));
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
