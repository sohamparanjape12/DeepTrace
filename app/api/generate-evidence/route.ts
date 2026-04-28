import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { evaluateEligibility } from '@/lib/dmca/eligibility';
import { generateEvidenceBundle } from '@/lib/dmca/evidence-bundle';
import { captureAsWarc } from '@/lib/dmca/warc-capture';
import { Asset, Violation } from '@/types';
import { CustomerProfile } from '@/lib/dmca/types';
import cloudinary from '@/lib/cloudinary';

/**
 * POST /api/generate-evidence
 *
 * Generates a forensic evidence bundle PDF for an eligible violation.
 * Idempotent: skips if evidence_bundle_url already exists.
 * Uses only cached data from the pipeline — no new Gemini or Jina calls.
 */
export async function POST(req: NextRequest) {
  try {
    const { violationId } = await req.json();

    if (!violationId) {
      return NextResponse.json({ error: 'Missing violationId' }, { status: 400 });
    }

    console.log(`[Evidence] Generating bundle for violation: ${violationId}`);

    // 1. Fetch violation
    const vRef = db.collection('violations').doc(violationId);
    const vSnap = await vRef.get();
    if (!vSnap.exists) {
      return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    }
    const violation = { violation_id: vSnap.id, ...vSnap.data() } as Violation;

    // 2. Idempotency check
    if ((violation as any).evidence_bundle_url) {
      console.log(`[Evidence] Bundle already exists for ${violationId}. Skipping.`);
      return NextResponse.json({
        success: true,
        bundleUrl: (violation as any).evidence_bundle_url,
        sha256: (violation as any).evidence_sha256,
        message: 'Already generated',
      });
    }

    // 3. Fetch asset
    const aRef = db.collection('assets').doc(violation.asset_id);
    const aSnap = await aRef.get();
    if (!aSnap.exists) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    const asset = { id: aSnap.id, ...aSnap.data() } as Asset;

    // 4. Fetch customer profile
    const cDoc = await db.collection('organizations').doc(violation.owner_id).get();
    let customer: CustomerProfile = cDoc.exists
      ? (cDoc.data() as CustomerProfile)
      : { id: violation.owner_id, org_name: asset.owner_org || 'Unknown', dmca_attestation_signed: false };

    // 5. Evaluate eligibility — evidence generation must be possible even if a DMCA draft exists.
    //    The library function already handles the manual override for 'disputed' status.
    const eligibility = evaluateEligibility(violation, asset, customer, { allowInFlight: true });
    
    // We allow evidence generation if the engine says it's eligible.
    // Note: The library already ignores forensic blockers if status === 'disputed'.
    if (!eligibility.eligible) {
      console.log(`[Evidence] Violation ${violationId} not eligible:`, eligibility.blocked_by);
      
      const isMissingAttestation = eligibility.blocked_by?.includes('missing_attestation');
      
      return NextResponse.json({
        error: isMissingAttestation
          ? 'Onboarding required: You must sign the legal attestation before generating evidence.' 
          : 'Violation does not meet DMCA eligibility criteria',
        blocked_by: eligibility.blocked_by,
        reasons: eligibility.reasons,
      }, { status: 400 });
    }

    // 6. WARC capture of the infringing URL (forensic evidence)
    let warcResult = null;
    try {
      warcResult = await captureAsWarc(violation.match_url);
      console.log(`[Evidence] WARC captured: status=${warcResult.httpStatus}, server=${warcResult.serverIp}`);
    } catch (e: any) {
      console.error(`[Evidence] WARC capture failed (non-blocking):`, e.message);
    }

    // 6b. Wayback Machine Capture (for high visual fidelity)
    let waybackUrl = null;
    try {
      // Trigger a save on the Wayback Machine
      await fetch(`https://web.archive.org/save/${violation.match_url}`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) // Don't block for more than 10s
      });
      // Construct the generic timeline URL which will show the latest capture
      waybackUrl = `https://web.archive.org/web/*/${violation.match_url}`;
      console.log(`[Evidence] Triggered Wayback Machine capture for ${violation.match_url}`);
    } catch (e: any) {
      console.error(`[Evidence] Wayback capture trigger failed:`, e.message);
    }

    // 7. Generate the PDF
    const { buffer, sha256 } = await generateEvidenceBundle(violation, asset, eligibility, warcResult);
    console.log(`[Evidence] PDF generated: ${buffer.length} bytes, SHA-256: ${sha256}`);

    // 8. Upload PDF to Cloudinary
    const bundleUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'evidence_bundles',
          public_id: `evidence_${violationId}`,
          resource_type: 'raw',
          format: 'pdf',
          access_mode: 'public',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      uploadStream.end(buffer);
    });

    // 9. Upload WARC to Cloudinary (if captured)
    let warcUrl: string | null = null;
    if (warcResult && warcResult.warcBuffer.length > 0) {
      try {
        warcUrl = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'evidence_bundles/warc',
              public_id: `warc_${violationId}`,
              resource_type: 'raw',
              format: 'warc',
              access_mode: 'public',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result!.secure_url);
            }
          );
          uploadStream.end(warcResult!.warcBuffer);
        });
        console.log(`[Evidence] WARC uploaded: ${warcUrl}`);
      } catch (e: any) {
        console.error(`[Evidence] WARC upload failed (non-blocking):`, e.message);
      }
    }

    // 10. Update Firestore
    await vRef.update({
      evidence_status: 'generated',
      evidence_bundle_url: bundleUrl,
      evidence_sha256: sha256,
      evidence_generated_at: FieldValue.serverTimestamp(),
      ...(warcUrl ? { evidence_warc_url: warcUrl } : {}),
      ...(waybackUrl ? { evidence_wayback_url: waybackUrl } : {}),
      ...(warcResult ? {
        evidence_warc_metadata: {
          server_ip: warcResult.serverIp,
          http_status: warcResult.httpStatus,
          content_type: warcResult.contentType,
          captured_at: warcResult.capturedAt,
        },
      } : {}),
    });

    // 11. Audit log
    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      action_type: 'evidence_bundle_generated',
      actor: 'system',
      violation_id: violationId,
      asset_id: violation.asset_id,
      evidence_sha256: sha256,
    });

    console.log(`[Evidence] Bundle complete for ${violationId}: ${bundleUrl}`);

    return NextResponse.json({
      success: true,
      bundleUrl,
      sha256,
      warcUrl,
      waybackUrl,
    });

  } catch (error: any) {
    console.error('[Evidence] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
