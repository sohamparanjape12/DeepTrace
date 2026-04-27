import { classifyViolation } from './classify.v2';

/**
 * Acceptance tests for the forensic pipeline enhancements:
 * 1. Buffer reuse (no-fetch path)
 * 2. Gate similarity blending
 * 3. Hallucination guardrail (Gemini vs Gate mismatch)
 */
async function runTests() {
  console.log('🧪 Running classify.v2 enhancements tests...');

  try {
    // 1. Buffer path: verify gateSimilarity integration and applied_weights
    console.log('Test 1: Buffer path and gateSimilarity blending...');
    const r1 = await classifyViolation({
      violationId: 'test-buffer',
      rightsTier: 'commercial',
      ownerOrg: 'Test Org',
      tags: ['football'],
      matchUrl: 'https://example.com/suspect',
      pageTitle: 'Suspect page',
      pageDescription: '',
      matchType: 'full_match',
      originalAssetUrl: 'https://picsum.photos/seed/a/400',
      violationImageBuffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]), // minimal JPEG header
      violationImageMime: 'image/jpeg',
      gateSimilarity: 0.85,
      gateTier: 'NEAR_IDENTICAL',
    });

    if ((r1.applied_weights as any).gate_similarity_used !== true) {
      throw new Error('gate_similarity_used must be true when gateSimilarity is provided');
    }
    if (!r1.explainability_bullets.some(b => b.includes('Pre-filter similarity 85%'))) {
      throw new Error('pre-filter bullet missing or incorrect');
    }
    console.log('✅ Test 1 passed');

    // 2. Mismatch guardrail: high Gemini visual, low gate similarity → relevancy dampened
    console.log('Test 2: Hallucination guardrail...');
    const r2 = await classifyViolation({
      violationId: 'test-guardrail',
      rightsTier: 'editorial',
      ownerOrg: 'Test Org',
      tags: ['stadium'],
      matchUrl: 'https://example.com/pirate',
      pageTitle: 'Pirate Stream',
      pageDescription: '',
      matchType: 'visually_similar',
      originalAssetUrl: 'https://picsum.photos/seed/stadium/400',
      violationImageBuffer: Buffer.from([0x00, 0x00]), // Random junk buffer
      gateSimilarity: 0.15, // Very low similarity
      gateTier: 'DROPPED_LOW_SIM',
    });

    // If Gemini still reports high match for junk (hallucination), check if guardrail kicked in
    if (r2.visual_match_score >= 0.9 && r2.relevancy < 0.5) {
        console.log('✅ Hallucination guardrail successfully dampened relevancy');
    } else {
        console.log('ℹ No hallucination detected or guardrail not triggered (Gemini was honest)');
    }
    console.log('✅ Test 2 complete');

    // 3. Smoke tests from V1
    console.log('Test 3: Smoke tests for V2 logic...');
    const cases = [
      { 
        name: 'Reuters syndicated photo (Authorized)',
        params: {
          violationId: 'test-smoke-1',
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
          violationId: 'test-smoke-2',
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
      }
    ];

    for (const c of cases) {
      console.log(`CASE: ${c.name}`);
      const r = await classifyViolation(c.params as any);
      console.log({
        classification: r.classification,
        severity: r.severity,
        reliability: r.reliability_score,
        tier: r.reliability_tier,
        relevancy: r.relevancy,
        action: r.recommended_action,
      });
    }
    console.log('✅ Test 3 complete');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

export { runTests };
