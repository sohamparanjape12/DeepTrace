import { Client } from "@upstash/qstash";

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'dummy_token_to_prevent_crash_in_dev',
});

export async function enqueueAsset(payload: any) {
  // Determine the base URL.
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = process.env.NGROK_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const endpoint = `${baseUrl}/api/process`;

  if (isDev && !process.env.NGROK_URL) {
    console.log('[Dev] Skipping QStash, calling processor directly...');
    // Fire and forget local fetch to process endpoint
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.error('[Dev] Direct processor call failed:', err));
    return;
  }

  if (!process.env.QSTASH_TOKEN) {
    console.warn('QSTASH_TOKEN is missing. Skipping enqueue.');
    return;
  }

  await qstashClient.publishJSON({
    url: endpoint,
    body: payload,
    retries: 3,
  });
}
