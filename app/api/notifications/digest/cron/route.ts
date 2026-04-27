import { NextRequest, NextResponse } from 'next/server';
import { runDigestCron } from '@/lib/notifications/digest';

export async function POST(req: NextRequest) {
  // Verify QStash signature or internal cron key
  const authHeader = req.headers.get('authorization');
  const cronKey = process.env.INTERNAL_CRON_KEY;

  if (cronKey && authHeader !== `Bearer ${cronKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDigestCron();
    console.log(`[Digest Cron] Done. Processed: ${result.processed}, Errors: ${result.errors}`);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Digest Cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
