import { Asset, Violation } from '../../types';
import { CustomerProfile, EligibilityResult } from './types';

export function evaluateEligibility(
  violation: Violation, 
  asset: Asset, 
  customer: CustomerProfile,
  options: { allowInFlight?: boolean } = {}
): EligibilityResult {
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

  // 4. Rights-tier mismatch
  if (asset.rightsTier === 'general' && !violation.commercial_signal) {
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

  // 7. Not already in flight (unless allowed, e.g. for evidence regeneration)
  const dmcaStatus = (violation as any).dmca_status;
  if (dmcaStatus && dmcaStatus !== 'none' && dmcaStatus !== 'withdrawn') {
    blocked_by.push('already_in_flight');
    reasons.push(`DMCA status is currently '${dmcaStatus}'.`);
  } else {
    reasons.push('No existing DMCA notice is active.');
  }

  // 8. Manual Override Check
  const isManualOverride = violation.status === 'disputed';
  
  // Decide if we are truly eligible
  // Forensics are bypassed if disputed.
  // missing_attestation is ALWAYS a blocker.
  // already_in_flight is a blocker UNLESS options.allowInFlight is true.
  
  const hasMissingAttestation = blocked_by.includes('missing_attestation');
  const isInFlight = blocked_by.includes('already_in_flight');
  
  let eligible = false;
  
  if (isManualOverride) {
    // Override forensic checks, but respect attestation and in-flight (if not allowed)
    eligible = !hasMissingAttestation && (options.allowInFlight || !isInFlight);
  } else {
    // Standard path: no blockers except potentially in-flight (if allowed)
    const effectiveBlockers = blocked_by.filter(b => options.allowInFlight ? b !== 'already_in_flight' : true);
    eligible = effectiveBlockers.length === 0;
  }

  return {
    eligible,
    reasons,
    blocked_by
  };
}
