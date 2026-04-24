# DeepTrace Pipeline Implementation Plan

This plan outlines the phase-wise execution to transform the current Next.js `after()`-based synchronous batch processing into a highly scalable, reliable, and cost-efficient asynchronous worker pipeline using QStash, Redis, pHash, and Clustering.

## User Review Required
> [!IMPORTANT]
> This is a major architectural shift. We are introducing external dependencies (Upstash Redis, Upstash QStash) and changing how the core pipeline operates.
> Please review the open questions below before we begin execution.

## Open Questions
> [!WARNING]
> 1. **Upstash Credentials**: Do you already have `QSTASH_TOKEN`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` in your environment? (I see you mentioned "my api keys have been added", but please confirm they cover Upstash).
> 2. **Archiving Strategy**: In Phase 8, we hit the Internet Archive (`web.archive.org`). Do you want this to be a fire-and-forget call or should we block and wait for a successful snapshot? (Snapshotting can sometimes take several seconds/minutes).
> 3. **Firebase Emulator**: Since this pipeline uses QStash webhooks to call our local `/api/process`, how do you plan to route QStash to your localhost? (e.g., ngrok). During local development, we might need to simulate the queue or use ngrok.

## Proposed Changes

---

### Phase 1 & 2: Queue Integration & Worker Base Logic
Migrate away from Next.js `after()` loop and build a robust async worker endpoint.

#### [NEW] `lib/qstash.ts`
- Initialize `@upstash/qstash` client.
- Export `enqueueAsset(payload)` helper function.

#### [MODIFY] `app/api/analyze-batch/route.ts`
- Replace the `after()` batch processing loop.
- Instead, format the payload and call `enqueueAsset()` to send the job to QStash.
- Return immediately with success.

#### [NEW] `app/api/process/route.ts`
- The core QStash worker endpoint.
- Verify QStash signature (using `@upstash/qstash/nextjs`).
- Skeleton structure for the asset processing pipeline.

---

### Phase 3 & 4: Cost Optimization (pHash & Clustering)
Drop irrelevant matches and group similar ones to save Gemini costs.

#### [NEW] `lib/phash.ts`
- Implementation using `sharp` and `imghash` to generate a perceptual hash of images.
- Helper function to calculate Hamming distance.

#### [MODIFY] `app/api/process/route.ts`
- **pHash Filter**: Before processing a match, calculate its pHash. If the distance from the original asset > 10, skip it entirely.
- **Clustering**: Check if a cluster already exists for this pHash.
  - If yes: Link to cluster, mark `isRepresentative = false`.
  - If no: Create new cluster, mark `isRepresentative = true`.
- Update Firestore schema to store `hash`, `clusterId`, and `isRepresentative` on violations/matches.

---

### Phase 5 & 6: Rate Limiting & Gemini Integration
Prevent API exhaustion and analyze only the cluster representatives.

#### [NEW] `lib/ratelimit.ts`
- Initialize `@upstash/ratelimit` with Redis.
- Setup a Token Bucket limiter (e.g., 10 req / sec) for Gemini.

#### [MODIFY] `app/api/process/route.ts`
- Apply rate limiting before calling the Gemini `classifyViolation` helper.
- If rate limit exceeded, throw an error (QStash will automatically retry).
- Only call Gemini if the match is `isRepresentative`.
- Store the Gemini result on the violation record.

---

### Phase 7 & 8: Propagation & Archiving
Ensure consistent results and preserve evidence for legal defensibility.

#### [MODIFY] `app/api/process/route.ts`
- **Propagation**: After Gemini finishes for a representative, copy the result to all other non-representative violations in the same cluster.
- **Archiving**: Fire a fetch request to `https://web.archive.org/save/...` for the `match_url` to capture a snapshot. Save the archive URL and timestamp to Firestore.

---

### Phase 9, 10 & 11: Final Polish & Production Readiness
- Ensure complete idempotency (if a job is already `status == 'completed'`, skip).
- Add structured logging to `/api/process`.
- Update `package.json` with new dependencies (`@upstash/qstash`, `@upstash/ratelimit`, `@upstash/redis`, `sharp`, `imghash`).

## Verification Plan

### Automated/Local Tests
- Install dependencies and verify the build.
- Trigger an upload flow with the emulator running.

### Manual Verification
- Expose the local dev server using `ngrok` so QStash can reach `/api/process`.
- Upload an asset that generates multiple similar SerpAPI matches.
- Verify in Firestore that:
  - Only ONE match was sent to Gemini (isRepresentative = true).
  - Other matches inherited the result.
  - pHashes and cluster IDs are populated.
  - Archive URLs are generated.
