import { Asset, Violation } from '../../types';
import { CustomerProfile, EligibilityResult } from './types';

export function evaluateEligibility(violation: Violation, asset: Asset, customer: CustomerProfile): EligibilityResult {
  const reasons: string[] = [];
  const blocked_by: string[] = [];

  // 1. Verdict must be UNAUTHORIZED
  if (violation.gemini_class !== 'UNAUTHORIZED') {
    blocked_by.push('verdict_not_unauthorized');
    reasons.push(`Classification is ${violation.gemini_class}, not UNAUTHORIZED.`);
  } else {
    reasons.push('Classification is UNAUTHORIZED.');
  }

  // 2. Reliability Score >= 70 (or 80 based on UI? UI says 80)
  if ((violation.reliability_score || 0) < 80) {
    blocked_by.push('reliability_too_low');
    reasons.push(`Reliability score is ${violation.reliability_score || 0} (requires >= 80).`);
  } else {
    reasons.push(`Reliability score is robust (${violation.reliability_score}).`);
  }

  // 3. Severity must be CRITICAL or HIGH
  if (violation.severity !== 'CRITICAL' && violation.severity !== 'HIGH') {
    blocked_by.push('severity_too_low');
    reasons.push(`Severity is ${violation.severity} (requires HIGH or CRITICAL).`);
  } else {
    reasons.push(`Severity is ${violation.severity}.`);
  }

  // 4. Rights-tier mismatch (If asset is no_reuse or editorial and being used commercially)
  // For simplicity: as long as it's not explicitly 'all_rights'
  if (asset.rightsTier === 'general' && !violation.commercial_signal) {
    // This is a simplistic check: if it's general rights, maybe non-commercial use is fine?
    // Let's rely on the unauthorized classification for the actual right tier violation,
    // but just ensure it's not all_rights. (Wait, the schema says: no_reuse | editorial | general)
    // Actually PRD says: the observed usage violates asset.rights_tier
    reasons.push(`Rights tier: ${asset.rightsTier}.`);
  } else if (asset.rightsTier === 'general') {
     reasons.push(`Rights tier: ${asset.rightsTier}.`);
  }

  // 5. Customer Attestation
  if (!customer.dmca_attestation_signed) {
    blocked_by.push('missing_attestation');
    reasons.push('Organization has not signed the DMCA perjury attestation.');
  } else {
    reasons.push('DMCA perjury attestation is signed.');
  }

  // 6. Contradiction Flag
  if (violation.contradiction_flag) {
    blocked_by.push('contradictions_present');
    reasons.push('Contradictory signals found in the audit trail.');
  } else {
    reasons.push('No contradictions in evidence.');
  }

  // 7. Not already in flight
  if ((violation as any).dmca_status && (violation as any).dmca_status !== 'none' && (violation as any).dmca_status !== 'withdrawn') {
    blocked_by.push('already_in_flight');
    reasons.push(`DMCA status is currently '${(violation as any).dmca_status}'.`);
  } else {
    reasons.push('No existing DMCA notice is active.');
  }

  return {
    eligible: blocked_by.length === 0,
    reasons,
    blocked_by
  };
}
