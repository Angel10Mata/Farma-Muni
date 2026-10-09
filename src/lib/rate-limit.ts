type Bucket = {
  failures: number;
  windowStartedAt: number;
};

const buckets = new Map<string, Bucket>();

const ADMIN_CREDENTIAL_MAX_FAILURES = 5;
const ADMIN_CREDENTIAL_WINDOW_MS = 10 * 60 * 1000;

function adminCredentialKey(userId: string): string {
  return `admin-credential:${userId}`;
}

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= ADMIN_CREDENTIAL_WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

export function isAdminCredentialRateLimited(userId: string): boolean {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucket = buckets.get(adminCredentialKey(userId));
  if (!bucket) {
    return false;
  }
  if (now - bucket.windowStartedAt >= ADMIN_CREDENTIAL_WINDOW_MS) {
    buckets.delete(adminCredentialKey(userId));
    return false;
  }
  return bucket.failures >= ADMIN_CREDENTIAL_MAX_FAILURES;
}

export function recordAdminCredentialFailure(userId: string): void {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const key = adminCredentialKey(userId);
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStartedAt >= ADMIN_CREDENTIAL_WINDOW_MS) {
    buckets.set(key, { failures: 1, windowStartedAt: now });
    return;
  }
  existing.failures += 1;
}

export function clearAdminCredentialFailures(userId: string): void {
  buckets.delete(adminCredentialKey(userId));
}
