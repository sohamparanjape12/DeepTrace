import { NextRequest, NextResponse } from 'next/server';
import { analyzeAssetContext } from '@/lib/analyze-context';

/**
 * Perform intelligence analysis on an asset's context to determine severity and sentiment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caption, surroundingText, hashtags, metadata, imageUrl } = body;

    const result = await analyzeAssetContext({
      caption,
      surroundingText,
      hashtags,
      metadata,
      imageUrl
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Analyze Context API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
