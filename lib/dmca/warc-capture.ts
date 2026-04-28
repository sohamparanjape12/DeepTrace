import { WARCRecord, WARCSerializer } from 'warcio';

export interface WARCCaptureResult {
  warcBuffer: Buffer;
  serverIp: string | null;
  capturedAt: string; // ISO 8601 UTC
  httpStatus: number | null;
  httpHeaders: Record<string, string>;
  contentType: string | null;
}

/**
 * Performs a live HTTP fetch of the target URL and packages the response
 * into a WARC (Web ARChive) record for forensic evidence preservation.
 *
 * Returns the serialized WARC buffer along with extracted metadata
 * (server IP, HTTP headers, status code) for inclusion in the Evidence Bundle PDF.
 */
export async function captureAsWarc(targetUrl: string): Promise<WARCCaptureResult> {
  const capturedAt = new Date().toISOString();
  let serverIp: string | null = null;
  let httpStatus: number | null = null;
  let httpHeaders: Record<string, string> = {};
  let contentType: string | null = null;

  try {
    // 1. Fetch the target URL
    const response = await fetch(targetUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15s timeout
      headers: {
        'User-Agent': 'DeepTrace-Forensic-Archiver/1.0 (+https://deeptrace.app)',
      },
    });

    httpStatus = response.status;

    // Extract headers
    response.headers.forEach((value, key) => {
      httpHeaders[key.toLowerCase()] = value;
    });
    contentType = httpHeaders['content-type'] || null;

    // Try to extract server IP from headers (some CDNs expose this)
    serverIp = httpHeaders['x-served-by']
      || httpHeaders['x-cache']
      || httpHeaders['server']
      || null;

    // 2. Read response body
    let bodyBuffer = Buffer.from(await response.arrayBuffer());

    // ── FIX: Inject <base> tag for high-fidelity browser viewing ──
    // This allows ReplayWeb.page to fetch missing CSS/Images from the live site
    // while keeping the archived HTML as the primary source of truth.
    if (contentType?.includes('text/html')) {
      try {
        let html = bodyBuffer.toString('utf-8');
        const baseTag = `<base href="${targetUrl}">`;
        
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>\n    ${baseTag}`);
        } else if (html.includes('<html>')) {
          html = html.replace('<html>', `<html>\n<head>${baseTag}</head>`);
        } else {
          html = baseTag + html;
        }
        bodyBuffer = Buffer.from(html, 'utf-8');
      } catch (e) {
        console.warn('[WARC] Failed to inject base tag:', e);
      }
    }

    // 3. Construct HTTP status line + headers for the WARC payload
    const statusLine = `HTTP/1.1 ${response.status} ${response.statusText}\r\n`;
    const headerLines = Array.from(response.headers.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    const httpPayload = Buffer.concat([
      Buffer.from(statusLine + headerLines + '\r\n\r\n', 'utf-8'),
      bodyBuffer,
    ]);

    // 4. Create a WARC response record
    const record = await WARCRecord.create({
      url: targetUrl,
      date: capturedAt,
      type: 'response',
      warcHeaders: {
        'WARC-Target-URI': targetUrl,
        'WARC-Date': capturedAt,
        'WARC-IP-Address': serverIp || 'unknown',
      },
      httpHeaders: Object.fromEntries(response.headers.entries()),
      statusline: `HTTP/1.1 ${response.status} ${response.statusText}`,
    }, [bodyBuffer]);

    // 5. Serialize to buffer
    // For warcio 2.x, serialize returns an AsyncIterable<Uint8Array>
    const chunks: Uint8Array[] = [];
    const stream = WARCSerializer.serialize(record, { gzip: false }) as any;
    
    if (stream[Symbol.asyncIterator]) {
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    } else {
      // Fallback for non-streaming environments or types
      chunks.push(await stream);
    }
    
    const warcBuffer = Buffer.concat(chunks.map(c => Buffer.from(c)));

    return {
      warcBuffer,
      serverIp,
      capturedAt,
      httpStatus,
      httpHeaders,
      contentType,
    };
  } catch (error: any) {
    console.error(`[WARC] Capture failed for ${targetUrl}:`, error.message);

    // Return a minimal "failed capture" result with metadata we do have
    return {
      warcBuffer: Buffer.alloc(0),
      serverIp,
      capturedAt,
      httpStatus,
      httpHeaders,
      contentType,
    };
  }
}
