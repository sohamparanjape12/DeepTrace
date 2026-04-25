import { classifyViolation, ClassifyParams } from "./classify";

// To run this test manually:
// npx tsx lib/classify.test.ts

async function runTests() {
  const testCases: { name: string; params: ClassifyParams }[] = [
    {
      name: "1. Unauthorized commercial reuse (Piracy)",
      params: {
        matchUrl: "https://sketchy-merch-store.com/buy/team-photo",
        pageTitle: "Buy official team photo prints",
        pageDescription: "Get the best unauthorized prints of the final game. 50% off!",
        matchType: "full_match",
        rightsTier: "commercial",
        ownerOrg: "FC Sports",
        tags: ["soccer", "championship", "final"],
        violationId: "test-v-1",
      },
    },
    {
      name: "2. Editorial news usage",
      params: {
        matchUrl: "https://global-sports-news.com/article/championship-recap",
        pageTitle: "FC Sports Wins Championship in Thrilling Final",
        pageDescription: "A recap of the historic final match and player performances.",
        matchType: "partial_match",
        rightsTier: "editorial",
        ownerOrg: "FC Sports",
        tags: ["soccer", "championship", "final"],
        violationId: "test-v-2",
      },
    },
    {
      name: "3. Official team repost",
      params: {
        matchUrl: "https://twitter.com/FCSportsOfficial/status/123456",
        pageTitle: "FC Sports on Twitter",
        pageDescription: "We did it! Watch the highlights here.",
        matchType: "full_match",
        rightsTier: "commercial",
        ownerOrg: "FC Sports",
        tags: ["soccer", "championship", "highlights"],
        violationId: "test-v-3",
      },
    },
    {
      name: "4. Meme / Transformed image",
      params: {
        matchUrl: "https://reddit.com/r/soccer/comments/meme",
        pageTitle: "When you miss the open goal",
        pageDescription: "Funny meme editing the player's face onto a potato.",
        matchType: "visually_similar",
        rightsTier: "all_rights",
        ownerOrg: "FC Sports",
        tags: ["soccer", "fail", "player1"],
        violationId: "test-v-4",
      },
    },
    {
      name: "5. Ambiguous blog",
      params: {
        matchUrl: "https://random-fan-blog.net/post-10",
        pageTitle: "My thoughts on the game",
        pageDescription: "Here is a picture of the game.",
        matchType: "full_match",
        rightsTier: "commercial",
        ownerOrg: "FC Sports",
        tags: ["soccer", "review"],
        violationId: "test-v-5",
      },
    },
    {
      name: "6. Brand Safety Risk (Gambling site)",
      params: {
        matchUrl: "https://win-big-sports-betting.com/promotions",
        pageTitle: "Bet on the Championship Final - Win Big!",
        pageDescription: "Exclusive odds for the FC Sports game. Join now for a 200% bonus.",
        matchType: "full_match",
        rightsTier: "no_reuse",
        ownerOrg: "FC Sports",
        tags: ["soccer", "betting", "odds"],
        violationId: "test-v-risk",
      },
    },
  ];

  for (const tc of testCases) {
    console.log(`\n--- Running Test: ${tc.name} ---`);
    try {
      const result = await classifyViolation(tc.params);
      console.log("Classification:", result.classification);
      console.log("Confidence  :", result.confidence);
      console.log("Severity    :", result.severity);
      console.log("Visual Match:", ((result.visual_match_score ?? 0) * 100).toFixed(2) + "%");
      console.log("Reasoning   :", result.reasoning);
      console.log("Signals     :", {
        commercial_signal: result.commercial_signal,
        watermark_likely_removed: result.watermark_likely_removed,
      });
      console.log("Sentiment   :", result.sentiment);
      console.log("Risk        :", result.brand_safety_risk);
      console.log("Risk Factors:", result.risk_factors);
    } catch (e) {
      console.error("Test failed:", e);
    }
  }
}

// Ignore execution if imported (for testing envs)
if (require.main === module) {
  runTests();
}
