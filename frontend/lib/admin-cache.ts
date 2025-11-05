/**
 * Simple cache for admin status to avoid redundant API calls
 */

let adminStatusCache: {
  isAdmin: boolean | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached admin status if available and not expired
 */
export function getCachedAdminStatus(): boolean | null {
  if (!adminStatusCache) return null;
  
  const now = Date.now();
  if (now - adminStatusCache.timestamp > CACHE_DURATION) {
    adminStatusCache = null;
    return null;
  }
  
  return adminStatusCache.isAdmin;
}

/**
 * Set cached admin status
 */
export function setCachedAdminStatus(isAdmin: boolean): void {
  adminStatusCache = {
    isAdmin,
    timestamp: Date.now(),
  };
}

/**
 * Clear cached admin status (useful on logout)
 */
export function clearAdminStatusCache(): void {
  adminStatusCache = null;
}

