import { classifyViolation } from './classify.v2';

// Simple manual smoke test for v2 logic
async function runTests() {
  const cases = [
    { 
      name: 'Reuters syndicated photo (Authorized)',
      params: {
        violationId: 'test-1',
        rightsTier: 'editorial',
        ownerOrg: 'UEFA Media',
        tags: ['football', 'champions league'],
        matchUrl: 'https://www.reuters.com/sports/soccer/2024-final',
        pageTitle: 'UEFA Champions League final photo gallery',
        pageDescription: 'Match photos from Wembley stadium.',
        matchType: 'full_match' as const,
        originalAssetUrl: 'https://images.uefa.com/original.jpg',
        violationImageUrl: 'https://www.reuters.com/reuters-same.jpg',
      }
    },
    { 
      name: 'bet365 match photo (Critical)',
      params: {
        violationId: 'test-2',
        rightsTier: 'commercial',
        ownerOrg: 'UEFA Media',
        tags: ['football'],
        matchUrl: 'https://www.bet365.com/promo/champions-league',
        pageTitle: 'Bet on tonight\'s final',
        pageDescription: 'Live betting odds and match photos.',
        matchType: 'full_match' as const,
        originalAssetUrl: 'https://images.uefa.com/original.jpg',
        violationImageUrl: 'https://www.bet365.com/bet365-crop.jpg',
      }
    },
    { 
      name: 'Temporal impossibility (Authorized)',
      params: {
        violationId: 'test-3',
        rightsTier: 'commercial',
        ownerOrg: 'UEFA Media',
        tags: ['football'],
        matchUrl: 'https://oldblog.com/2018/report',
        pageTitle: '2018 match report',
        pageDescription: 'Old match report archive.',
        pagePublishedAt: '2018-05-20',
        assetCaptureDate: '2024-06-01',
        matchType: 'visually_similar' as const,
      }
    }
  ];

  console.log("Starting Forensic v2 Smoke Tests...\n");

  for (const c of cases) {
    try {
      console.log(`CASE: ${c.name}`);
      const r = await classifyViolation(c.params as any);
      console.log({
        classification: r.classification,
        severity: r.severity,
        reliability: r.reliability_score,
        tier: r.reliability_tier,
        relevancy: r.relevancy,
        abstain: r.abstained,
        contradiction: r.contradiction_flag,
        action: r.recommended_action,
        domain: r.domain_class,
      });
      console.log("-----------------------------------\n");
    } catch (e) {
      console.error(`FAILED: ${c.name}`, e);
    }
  }
}

// runTests().catch(console.error);
console.log("Smoke test file created. Run with 'pnpm tsx lib/classify.v2.test.ts' to execute.");
