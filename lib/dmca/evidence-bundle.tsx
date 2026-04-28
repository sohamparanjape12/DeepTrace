import React from 'react';
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
} from '@react-pdf/renderer';
import crypto from 'crypto';
import { Asset, Violation } from '../../types';
import { EligibilityResult } from './types';
import { WARCCaptureResult } from './warc-capture';

// ── Styles ──

const colors = {
  black: '#0A0A0A',
  dark: '#1A1A2E',
  mid: '#4A4A6A',
  light: '#8888AA',
  faint: '#E8E8F0',
  white: '#FFFFFF',
  green: '#22C55E',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  accent: '#6366F1',
};

const s = StyleSheet.create({
  // Page
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.dark,
    backgroundColor: colors.white,
  },

  // Cover
  coverHeader: {
    backgroundColor: colors.dark,
    padding: 24,
    marginBottom: 20,
    borderRadius: 4,
  },
  coverTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 10,
    color: '#AAAACC',
  },

  // Section
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: `1px solid ${colors.faint}`,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Metadata grid
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    width: 160,
    fontWeight: 'bold',
    fontSize: 8,
    color: colors.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    flex: 1,
    fontSize: 9,
    color: colors.dark,
  },

  // Eligibility
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  checkmark: {
    width: 14,
    fontSize: 10,
    color: colors.green,
    marginRight: 6,
  },
  crossmark: {
    width: 14,
    fontSize: 10,
    color: colors.red,
    marginRight: 6,
  },
  eligibilityLabel: {
    fontSize: 9,
    color: colors.dark,
  },

  // Visual comparison
  imageRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  imageBlock: {
    flex: 1,
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    maxHeight: 260,
    objectFit: 'contain',
    border: `1px solid ${colors.faint}`,
    borderRadius: 2,
  },

  // Bullets
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 9,
    color: colors.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: colors.dark,
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTop: `1px solid ${colors.faint}`,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: colors.light,
  },

  // Reasoning block
  reasoningBlock: {
    backgroundColor: '#F8F8FC',
    padding: 12,
    borderRadius: 3,
    marginBottom: 10,
    border: `1px solid ${colors.faint}`,
  },
  reasoningText: {
    fontSize: 9,
    color: colors.dark,
    lineHeight: 1.5,
  },

  // WARC
  warcBlock: {
    backgroundColor: '#F0F0F8',
    padding: 10,
    borderRadius: 3,
    marginTop: 6,
    fontFamily: 'Courier',
  },
  warcText: {
    fontSize: 7,
    color: colors.mid,
    lineHeight: 1.3,
  },
});

// ── Helpers ──

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

function EligibilityItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <View style={s.eligibilityRow}>
      <Text style={passed ? s.checkmark : s.crossmark}>{passed ? '✓' : '✗'}</Text>
      <Text style={s.eligibilityLabel}>{label}</Text>
    </View>
  );
}

// ── Document Component ──

interface EvidenceBundleProps {
  violation: Violation;
  asset: Asset;
  eligibility: EligibilityResult;
  warc: WARCCaptureResult | null;
  generatedAt: string;
  assetImage?: string; // base64
  matchImage?: string; // base64
}

const EvidenceBundleDocument = ({ 
  violation, 
  asset, 
  eligibility, 
  warc, 
  generatedAt,
  assetImage,
  matchImage 
}: EvidenceBundleProps) => {
  const blocked = new Set(eligibility.blocked_by || []);
  const matchDomain = (() => {
    try { return new URL(violation.match_url).hostname; }
    catch { return 'unknown'; }
  })();

  return (
    <Document>
      {/* ═══ PAGE 1: FORENSIC COVER ═══ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.coverHeader}>
          <Text style={s.coverTitle}>Forensic Evidence Bundle</Text>
          <Text style={s.coverSubtitle}>
            DeepTrace Forensic Content Audit — Case {violation.violation_id?.slice(0, 12)}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Case Metadata</Text>
          <MetaField label="Case ID" value={violation.violation_id || violation.idempotency_key || 'N/A'} />
          <MetaField label="Generated At (UTC)" value={generatedAt} />
          <MetaField label="Original Asset" value={asset.name || 'Unnamed Asset'} />
          <MetaField label="Rights Tier" value={asset.rights_tier || asset.rightsTier || 'N/A'} />
          <MetaField label="Owner Org" value={asset.owner_org || 'N/A'} />
          <MetaField label="Infringing URL" value={violation.match_url} />
          <MetaField label="Infringing Domain" value={matchDomain} />
          <MetaField label="Detected At" value={violation.detected_at || 'N/A'} />
          <MetaField label="Asset pHash" value={asset.phash || asset.hash || 'Not computed'} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Classification Summary</Text>
          <MetaField label="Verdict" value={violation.gemini_class || 'N/A'} />
          <MetaField label="Severity" value={violation.severity || 'N/A'} />
          <MetaField label="Reliability Score" value={`${violation.reliability_score ?? 0} / 100`} />
          <MetaField label="Reliability Tier" value={violation.reliability_tier || 'N/A'} />
          <MetaField label="Confidence" value={`${((violation.confidence ?? 0) * 100).toFixed(0)}%`} />
          <MetaField label="Domain Class" value={violation.domain_class || 'N/A'} />
          <MetaField label="Commercial Signal" value={violation.commercial_signal ? 'Yes' : 'No'} />
          <MetaField label="Derivative Work" value={violation.is_derivative_work ? 'Yes' : 'No'} />
          <MetaField label="Recommended Action" value={violation.recommended_action || 'N/A'} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>DMCA Eligibility Audit</Text>
          <EligibilityItem label="Verdict is UNAUTHORIZED" passed={!blocked.has('verdict_not_unauthorized')} />
          <EligibilityItem label="Reliability Score ≥ 80" passed={!blocked.has('reliability_too_low')} />
          <EligibilityItem label="Severity is HIGH or CRITICAL" passed={!blocked.has('severity_too_low')} />
          <EligibilityItem label="Perjury Attestation Signed" passed={!blocked.has('missing_attestation')} />
          <EligibilityItem label="No Contradictions in Evidence" passed={!blocked.has('contradictions_present')} />
          <EligibilityItem label="No Active DMCA Notice" passed={!blocked.has('already_in_flight')} />
        </View>

        {warc && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>WARC Capture Metadata</Text>
            <MetaField label="Capture Timestamp" value={warc.capturedAt} />
            <MetaField label="Server / CDN" value={warc.serverIp || 'Not disclosed'} />
            <MetaField label="HTTP Status" value={warc.httpStatus ? String(warc.httpStatus) : 'N/A'} />
            <MetaField label="Content-Type" value={warc.contentType || 'N/A'} />
            <View style={s.warcBlock}>
              <Text style={s.warcText}>
                {Object.entries(warc.httpHeaders).slice(0, 10).map(
                  ([k, v]) => `${k}: ${v}`
                ).join('\n')}
              </Text>
            </View>
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>DeepTrace Forensic Content Audit Report</Text>
          <Text style={s.footerText}>Page 1 of 3</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: VISUAL COMPARISON ═══ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Visual Evidence — Side-by-Side Comparison</Text>
        </View>

        <View style={s.imageRow}>
          <View style={s.imageBlock}>
            <Text style={s.imageLabel}>Original Asset</Text>
            {assetImage ? (
              <Image src={assetImage} style={s.image} />
            ) : (
              <Text style={{ fontSize: 9, color: colors.light }}>Image not available</Text>
            )}
          </View>
          <View style={s.imageBlock}>
            <Text style={s.imageLabel}>Infringing Match</Text>
            {matchImage ? (
              <Image src={matchImage} style={s.image} />
            ) : (
              <Text style={{ fontSize: 9, color: colors.light }}>Image not available</Text>
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Match Details</Text>
          <MetaField label="Match URL" value={violation.match_url} />
          <MetaField label="Match Type" value={violation.match_type || 'visually_similar'} />
          <MetaField
            label="Visual Match Score"
            value={violation.visual_match_score ? `${(violation.visual_match_score * 100).toFixed(0)}%` : 'N/A'}
          />
          <MetaField
            label="Contextual Match Score"
            value={violation.contextual_match_score ? `${(violation.contextual_match_score * 100).toFixed(0)}%` : 'N/A'}
          />
          <MetaField
            label="Gate Similarity"
            value={(violation as any).gate_similarity ? `${((violation as any).gate_similarity * 100).toFixed(1)}%` : 'N/A'}
          />
          <MetaField
            label="Gate Tier"
            value={(violation as any).gate_tier || 'N/A'}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Scraped Page Context</Text>
          <MetaField label="Page Title" value={violation.scraped_cache?.title || violation.page_context || 'N/A'} />
          <MetaField label="Page Description" value={violation.scraped_cache?.description || 'N/A'} />
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>DeepTrace Forensic Content Audit Report</Text>
          <Text style={s.footerText}>Page 2 of 3</Text>
        </View>
      </Page>

      {/* ═══ PAGE 3: LEGAL ANALYSIS & REASONING ═══ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Forensic Analysis & Legal Reasoning</Text>
        </View>

        {violation.gemini_reasoning && (
          <View style={s.section}>
            <Text style={{ ...s.sectionTitle, fontSize: 9, borderBottom: 'none' }}>Full Reasoning</Text>
            <View style={s.reasoningBlock}>
              <Text style={s.reasoningText}>{violation.gemini_reasoning}</Text>
            </View>
          </View>
        )}

        {violation.explainability_bullets && violation.explainability_bullets.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Explainability Bullets</Text>
            {violation.explainability_bullets.map((bullet, i) => (
              <View key={i} style={s.bullet}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        )}

        {violation.reasoning_steps && violation.reasoning_steps.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Reasoning Steps</Text>
            {violation.reasoning_steps.map((step, i) => (
              <View key={i} style={s.bullet}>
                <Text style={s.bulletDot}>{i + 1}.</Text>
                <Text style={s.bulletText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Signal Summary</Text>
          <MetaField label="Commercial Signal" value={violation.commercial_signal ? 'DETECTED — Commercial use indicators found' : 'Not detected'} />
          <MetaField label="Derivative Work" value={violation.is_derivative_work ? 'YES — Modifications detected' : 'No'} />
          <MetaField label="Watermark Removed" value={violation.watermark_likely_removed ? 'LIKELY — Watermark appears stripped' : 'Not detected'} />
          <MetaField label="Contradiction Flag" value={violation.contradiction_flag ? 'WARNING — Contradictory signals present' : 'Clean — No contradictions'} />
          <MetaField label="Abstain" value={violation.abstain ? 'YES — Insufficient evidence for confident ruling' : 'No'} />
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>DeepTrace Forensic Content Auditor</Text>
          <Text style={s.footerText}>Page 3 of 3</Text>
        </View>
      </Page>
    </Document>
  );
};

// ── Public API ──

export interface EvidenceBundleOutput {
  buffer: Buffer;
  sha256: string;
}

export async function generateEvidenceBundle(
  violation: Violation,
  asset: Asset,
  eligibility: EligibilityResult,
  warc: WARCCaptureResult | null,
): Promise<EvidenceBundleOutput> {
  const generatedAt = new Date().toISOString();

  // Pre-fetch images to ensure they display in PDF
  const fetchAsBase64 = async (url?: string) => {
    if (!url) return undefined;
    
    // basic sanitization of the URL
    const targetUrl = url.trim().replace(/ /g, '%20');

    try {
      const res = await fetch(targetUrl, { 
        signal: AbortSignal.timeout(12000), // increased timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 DeepTrace-Forensic-Archiver/1.0',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      
      if (!res.ok) {
        console.warn(`[PDF] Image fetch failed (${res.status}): ${targetUrl}`);
        return undefined;
      }
      
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/png';
      
      // Verification: Ensure it's actually an image
      if (!contentType.startsWith('image/') && !targetUrl.includes('firebasestorage') && !targetUrl.includes('cloudinary')) {
        console.warn(`[PDF] URL returned non-image content-type (${contentType}): ${targetUrl}`);
        return undefined;
      }

      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.warn(`[PDF] Error pre-fetching image: ${targetUrl}`, e);
      return undefined;
    }
  };

  const [assetImage, matchImage] = await Promise.all([
    fetchAsBase64(asset.storageUrl || asset.url),
    fetchAsBase64(violation.assetThumbnailUrl || (violation.match_url?.match(/\.(jpg|jpeg|png|webp)/i) ? violation.match_url : undefined))
  ]);

  const pdfBuffer = await renderToBuffer(
    <EvidenceBundleDocument
      violation={violation}
      asset={asset}
      eligibility={eligibility}
      warc={warc}
      generatedAt={generatedAt}
      assetImage={assetImage}
      matchImage={matchImage}
    /> as any
  );

  // Compute SHA-256 hash for zero-edit integrity verification
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  return { buffer: pdfBuffer, sha256 };
}
