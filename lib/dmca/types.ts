import { Asset, Violation } from '../../types';
import { z } from 'zod';

export type DMCAStatus = 'none' | 'drafting' | 'pending_review' | 'sent' | 'acknowledged' | 'removed' | 'counter_notice' | 'escalated' | 'withdrawn';

export interface CustomerProfile {
  id: string;
  org_name: string;
  dmca_attestation_signed: boolean;
  dmca_attestation?: {
    legal_name: string;
    mailing_address: string;
    phone: string;
    email: string;
    authorized_agent_name: string;
    electronic_signature: string;
    signed_at: string;
    ip: string;
    user_agent: string;
  };
  dmca_auto_dispatch?: boolean;
  legal_contact_email?: string;
}

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];           // why eligible OR why blocked
  blocked_by: string[];        // explicit blockers, empty if eligible
};

export interface HostInfo {
  domain: string;
  agent_name?: string;
  agent_email?: string;
  agent_address?: string;
  source: 'directory' | 'whois' | 'manual' | 'cache' | 'pattern_match';
  resolved_at: string;
}

export const NoticeDraftSchema = z.object({
  work_description: z.string().describe("1-2 sentences identifying the original work"),
  infringement_description: z.string().describe("1-2 sentences describing what was found"),
  evidence_summary: z.string().describe("2-4 bullet points, prefixed with '- '"),
  optional_context_note: z.string().max(400).optional().describe("<= 80 words, optional context for the host")
});

export type NoticeDraft = z.infer<typeof NoticeDraftSchema>;

export interface NoticeInput extends NoticeDraft {
  customer_org_name: string;
  agent_name: string;
  original_url: string;
  infringing_url: string;
  signature: string;
}

export interface DMCANotice {
  id: string;
  violation_id: string;
  asset_id: string;
  customer_id: string;
  host: HostInfo;
  draft: NoticeDraft & { model: string; generated_at: string };
  approved_by?: string;
  dispatched_at?: string;
  pdf_url?: string;
  status: DMCAStatus;
  status_history: Array<{ status: DMCAStatus; at: string; note?: string }>;
  counter_notice?: {
    received_at: string;
    text: string;
    signed_under_perjury: boolean;
    consents_to_jurisdiction: boolean;
    parsed_fields?: any;
  };
}
