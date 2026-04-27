'use client';

import { LegalPage } from '@/components/shared/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="April 2026"
      sections={[
        {
          title: "Service Overview",
          content: "DeepTrace provides a sovereign forensic infrastructure for digital asset protection. By accessing our platform, you agree to these terms and acknowledge our role as an automated enforcement tool."
        },
        {
          title: "Acceptable Use",
          content: [
            "You must hold the necessary rights or licenses for all assets you upload for protection.",
            "DeepTrace may not be used for harassment, copyright trolling, or any malicious automated activity.",
            "You are responsible for the accuracy of evidence provided in automated takedown notices.",
            "Any attempt to reverse-engineer our fingerprinting algorithms is strictly prohibited."
          ]
        },
        {
          title: "Subscription & Billing",
          content: "Services are billed on a recurring monthly or annual basis. Infrastructure tiers are determined by asset volume and resolution requirements as outlined on our pricing page."
        },
        {
          title: "Liability & Enforcement",
          content: "DeepTrace acts as a forensic tool. While we provide automated resolution pathways, the final legal responsibility for enforcement actions remains with the rights holder."
        },
        {
          title: "Termination",
          content: "We reserve the right to suspend accounts that violate our acceptable use policy or fail to maintain valid payment methods."
        }
      ]}
    />
  );
}
