import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status, reviewed_by } = await request.json();
    const { id } = await params;

    if (!['open', 'resolved', 'disputed', 'false_positive'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Fetch previous state
    const violationRef = db.collection('violations').doc(id);
    const violationSnap = await violationRef.get();

    if (!violationSnap.exists) {
      return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    }

    const prevState = violationSnap.data()?.status || 'open';
    const actor = reviewed_by || 'system';

    // Update the violation
    await violationRef.update({
      status,
      reviewed_by: actor,
    });

    // Write audit log
    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      action_type: 'status_change',
      actor,
      violation_id: id,
      prev_state: prevState,
      next_state: status
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
