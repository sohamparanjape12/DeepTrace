'use client';

import { LegalPage } from '@/components/shared/LegalPage';

export default function CompliancePage() {
  return (
    <LegalPage
      title="Compliance & Standards"
      lastUpdated="April 2026"
      sections={[
        {
          title: "Sovereign Integrity",
          content: "DeepTrace is designed to operate within the highest standards of international copyright and digital sovereignty. We adhere to the fundamental principles of data ownership and rights enforcement."
        },
        {
          title: "Global Standards",
          content: [
            "DMCA Compliance: Full support for Digital Millennium Copyright Act protocols.",
            "GDPR Alignment: Strict data processing boundaries for European citizens.",
            "WIPO Framework: Alignment with World Intellectual Property Organization guidelines.",
            "SOC 2 Type II: Infrastructure and security controls audited for reliability."
          ]
        },
        {
          title: "Transparency",
          content: "We provide full audit trails for every automated resolution action. Forensic evidence bundles are generated deterministically to ensure legal standing in any jurisdiction."
        },
        {
          title: "Ethics in AI",
          content: "Our Gemini Rights Engine is trained only on authorized datasets to prevent bias in violation classification. We prioritize accuracy over volume to minimize false-positive enforcement."
        }
      ]}
    />
  );
}
