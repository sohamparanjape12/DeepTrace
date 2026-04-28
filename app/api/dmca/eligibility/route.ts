import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { evaluateEligibility } from '@/lib/dmca/eligibility';
import { Asset, Violation } from '@/types';
import { CustomerProfile } from '@/lib/dmca/types';

export async function GET(req: NextRequest) {
  const violationId = req.nextUrl.searchParams.get('violationId');
  if (!violationId) return NextResponse.json({ error: 'Missing violationId' }, { status: 400 });

  try {
    const vDoc = await db.collection('violations').doc(violationId).get();
    if (!vDoc.exists) return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    const violation = vDoc.data() as Violation;

    const aDoc = await db.collection('assets').doc(violation.asset_id).get();
    if (!aDoc.exists) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    const asset = aDoc.data() as Asset;

    const cDoc = await db.collection('organizations').doc(violation.owner_id).get();
    let customer = cDoc.exists ? cDoc.data() as CustomerProfile : null;
    
    console.log(`[Eligibility] Org ${violation.owner_id}: exists=${cDoc.exists}, signed=${customer?.dmca_attestation_signed}, data=${JSON.stringify(customer)}`);
    
    // Fallback stub if customer profile not fully setup for DMCA MVP
    if (!customer) {
      customer = { id: violation.owner_id, org_name: 'Unknown', dmca_attestation_signed: false };
    }

    const result = evaluateEligibility(violation, asset, customer);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Eligibility check failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
