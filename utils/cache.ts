interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Global declaration for cache cleanup flag
declare global {
  var __cacheCleanupInitialized: boolean | undefined;
}

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>();

  // Default TTL: 24 hours for both geocoding and business listings
  private defaultTTL = {
    geocoding: 24 * 60 * 60 * 1000, // 24 hours
    business: 24 * 60 * 60 * 1000, // 24 hours
  };

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL.business);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Generate cache keys
  generateGeocodingKey(postalCode: string): string {
    return `geo:${postalCode.toLowerCase().trim()}`;
  }

  generateBusinessSearchKey(searchQuery: string, postalCode: string): string {
    return `search:${searchQuery.toLowerCase().trim()}:${postalCode
      .toLowerCase()
      .trim()}`;
  }

  generateBusinessDataKey(businessName: string, postalCode: string): string {
    return `biz:${businessName.toLowerCase().trim()}:${postalCode
      .toLowerCase()
      .trim()}`;
  }

  generateRatingKey(place_id: string): string {
    return `rating:${place_id}`;
  }
}

// Singleton instance for server-side caching
const serverCache = new ServerCache();

// Cleanup expired entries every 10 minutes
// Only run in server environment and prevent multiple intervals
if (typeof window === "undefined" && !global.__cacheCleanupInitialized) {
  global.__cacheCleanupInitialized = true;
  setInterval(() => {
    serverCache.cleanup();
  }, 10 * 60 * 1000);
}

export { serverCache, ServerCache };
export type { CacheEntry };
