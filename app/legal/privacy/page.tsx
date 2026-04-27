'use client';

import { LegalPage } from '@/components/shared/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="April 2026"
      sections={[
        {
          title: "Introduction",
          content: "DeepTrace Systems is committed to protecting the privacy of our users and the integrity of their digital assets. This policy outlines how we collect, process, and secure data within our forensic network."
        },
        {
          title: "Data Collection",
          content: [
            "Asset Metadata: We collect technical specifications and rights information about the media you upload for protection.",
            "Discovery Data: Our global nodes collect public web data relating to potential unauthorized usage of your assets.",
            "User Information: Standard account data including email, billing information, and access logs.",
            "Analytics: Non-personally identifiable usage data to improve our detection algorithms."
          ]
        },
        {
          title: "Processing & Forensics",
          content: "Media assets uploaded to DeepTrace are processed through our Visual Fingerprinting Layer. These fingerprints are cryptographic representations of visual data and do not contain reconstructible versions of your private media."
        },
        {
          title: "Data Security",
          content: "All data is encrypted at rest using AES-256 and in transit via TLS 1.3. Forensic evidence bundles are stored in sovereign-grade isolated environments with strict access controls."
        },
        {
          title: "Third-Party Disclosure",
          content: "We do not sell user data. Information may be shared with legal authorities or registrars only when explicitly triggered by a user's resolution workflow (e.g., filing a DMCA takedown notice)."
        }
      ]}
    />
  );
}
