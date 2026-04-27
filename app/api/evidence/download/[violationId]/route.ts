import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { evaluateEligibility } from '@/lib/dmca/eligibility';
import { generateEvidenceBundle } from '@/lib/dmca/evidence-bundle';
import { Asset, Violation } from '@/types';
import { CustomerProfile } from '@/lib/dmca/types';

export async function GET(req: NextRequest, props: { params: Promise<{ violationId: string }> }) {
  try {
    const { violationId } = await props.params;
    
    // 1. Fetch violation
    const vDoc = await db.collection('violations').doc(violationId).get();
    if (!vDoc.exists) {
      return new NextResponse('Violation not found', { status: 404 });
    }
    const violation = { violation_id: vDoc.id, ...vDoc.data() } as Violation;
    
    // 2. Fetch asset
    const aDoc = await db.collection('assets').doc(violation.asset_id).get();
    if (!aDoc.exists) {
      return new NextResponse('Asset not found', { status: 404 });
    }
    const asset = { id: aDoc.id, ...aDoc.data() } as Asset;

    // 3. Fetch customer profile (organization)
    const cDoc = await db.collection('organizations').doc(violation.owner_id).get();
    let customer: CustomerProfile = cDoc.exists
      ? (cDoc.data() as CustomerProfile)
      : { id: violation.owner_id, org_name: asset.owner_org || 'Unknown', dmca_attestation_signed: false };

    // 4. Evaluate eligibility
    const eligibility = evaluateEligibility(violation, asset, customer);

    // 5. Reconstruct WARC metadata for PDF display (if available)
    let warcResult = null;
    const meta = (violation as any).evidence_warc_metadata;
    if (meta) {
      warcResult = {
        capturedAt: meta.captured_at || meta.capturedAt,
        serverIp: meta.server_ip || meta.serverIp,
        httpStatus: meta.http_status || meta.httpStatus,
        contentType: meta.content_type || meta.contentType,
        httpHeaders: meta.httpHeaders || {},
        warcBuffer: Buffer.alloc(0) // Not needed for PDF rendering
      } as any;
    }

    // 6. Generate the PDF on the fly
    const { buffer } = await generateEvidenceBundle(violation, asset, eligibility, warcResult);
    
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Evidence_Bundle_${violationId}.pdf"`,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('On-the-fly Evidence PDF error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
