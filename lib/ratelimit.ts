import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isDev = process.env.NODE_ENV === 'development';

// Allow 10 requests per second
// Use a dummy redis instance in development if keys are missing to prevent crashes
export const geminiRateLimit = new Ratelimit({
  redis: (isDev && !process.env.UPSTASH_REDIS_REST_URL)
    ? new Redis({ url: 'https://dummy.upstash.io', token: 'dummy' })
    : Redis.fromEnv(),
  limiter: Ratelimit.tokenBucket(10, "1 s", 10),
  analytics: true,
});

