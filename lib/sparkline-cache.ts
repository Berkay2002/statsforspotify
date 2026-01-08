// Shared cache for sparkline data across all loader components
// This prevents duplicate requests and improves performance

interface CacheEntry {
  data: Record<string, { date: string; rank: number }[]>;
  timestamp: number;
}

class SparklineCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 100; // Prevent memory leaks
  
  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    
    // Check if entry exists and is not expired
    if (entry && Date.now() - entry.timestamp < this.CACHE_DURATION) {
      return entry;
    }
    
    // Remove expired entry
    if (entry) {
      this.cache.delete(key);
    }
    
    return undefined;
  }
  
  set(key: string, data: Record<string, { date: string; rank: number }[]>): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance shared across all components
export const sparklineCache = new SparklineCache();
