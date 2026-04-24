import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // In a real app we'd verify the token via headers.
    // For this prototype, we'll accept userId in the body.
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const assetRef = db.collection('assets').doc(id);
    const assetSnap = await assetRef.get();

    if (!assetSnap.exists) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const assetData = assetSnap.data();
    if (assetData?.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete associated violations
    const violationsSnapshot = await db
      .collection('violations')
      .where('asset_id', '==', id)
      .get();

    const batch = db.batch();
    
    violationsSnapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    // Delete the asset itself
    batch.delete(assetRef);

    // Commit the batch
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete asset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
