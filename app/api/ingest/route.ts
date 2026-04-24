import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { Asset, PipelineRightsTier } from '@/types';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, source, rightsTier } = body;

    if (!url || !source || !rightsTier) {
      return NextResponse.json(
        { error: 'Missing required fields: url, source, rightsTier' },
        { status: 400 }
      );
    }

    // Validate rightsTier
    const validTiers: PipelineRightsTier[] = ['no_reuse', 'editorial', 'general'];
    if (!validTiers.includes(rightsTier as PipelineRightsTier)) {
      return NextResponse.json(
        { error: `Invalid rightsTier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate a simple hash for the asset (for now, based on URL)
    // In a real scenario, this might be a hash of the file content
    const hash = crypto.createHash('sha256').update(url).digest('hex');

    const assetId = uuidv4();
    const now = new Date();

    const asset: Asset = {
      id: assetId,
      url,
      source,
      rightsTier,
      hash,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    await db.collection('assets_v2').doc(assetId).set({
      ...asset,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
