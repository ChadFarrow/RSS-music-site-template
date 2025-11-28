import fs from 'fs';
import path from 'path';

export interface CachedRSSData {
  data: any;
  lastFetched: string;
  url: string;
  etag?: string;
}

export interface RSSCacheEntry {
  [feedUrl: string]: CachedRSSData;
}

export class RSSCache {
  private static readonly CACHE_DIR = path.join(process.cwd(), 'data', 'rss-cache');
  private static readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  static ensureCacheDir() {
    if (!fs.existsSync(this.CACHE_DIR)) {
      fs.mkdirSync(this.CACHE_DIR, { recursive: true });
    }
  }

  static getCacheFilePath(feedUrl: string): string {
    // Create a safe filename from the URL
    const hash = Buffer.from(feedUrl).toString('base64')
      .replace(/[/+=]/g, '_');
    return path.join(this.CACHE_DIR, `${hash}.json`);
  }

  static get(feedUrl: string): CachedRSSData | null {
    try {
      this.ensureCacheDir();
      const cacheFile = this.getCacheFilePath(feedUrl);
      
      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const cacheData: CachedRSSData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const age = Date.now() - new Date(cacheData.lastFetched).getTime();
      
      // Check if cache is still valid
      if (age < this.CACHE_DURATION_MS) {
        console.log(`📦 Using cached RSS data for: ${feedUrl} (age: ${Math.round(age / 1000 / 60)}min)`);
        return cacheData;
      } else {
        console.log(`⏰ Cache expired for: ${feedUrl} (age: ${Math.round(age / 1000 / 60)}min)`);
        // Delete expired cache
        fs.unlinkSync(cacheFile);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error reading cache for ${feedUrl}:`, error);
      return null;
    }
  }

  static set(feedUrl: string, data: any, etag?: string): void {
    try {
      this.ensureCacheDir();
      const cacheFile = this.getCacheFilePath(feedUrl);
      
      const cacheData: CachedRSSData = {
        data,
        lastFetched: new Date().toISOString(),
        url: feedUrl,
        etag
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached RSS data for: ${feedUrl}`);
    } catch (error) {
      console.error(`❌ Error caching RSS data for ${feedUrl}:`, error);
    }
  }

  static clear(feedUrl?: string): void {
    try {
      this.ensureCacheDir();
      
      if (feedUrl) {
        // Clear specific feed cache
        const cacheFile = this.getCacheFilePath(feedUrl);
        if (fs.existsSync(cacheFile)) {
          fs.unlinkSync(cacheFile);
          console.log(`🗑️ Cleared cache for: ${feedUrl}`);
        }
      } else {
        // Clear all cache files
        const files = fs.readdirSync(this.CACHE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.CACHE_DIR, file));
          }
        }
        console.log(`🗑️ Cleared all RSS cache files (${files.length} files)`);
      }
    } catch (error) {
      console.error(`❌ Error clearing cache:`, error);
    }
  }

  static getCacheStats(): { totalFiles: number; totalSize: number; oldestCache?: string; newestCache?: string } {
    try {
      this.ensureCacheDir();
      const files = fs.readdirSync(this.CACHE_DIR).filter(f => f.endsWith('.json'));
      
      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      let oldestFile = '';
      let newestFile = '';

      for (const file of files) {
        const filePath = path.join(this.CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
          oldestFile = file;
        }
        
        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime();
          newestFile = file;
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestCache: oldestFile ? new Date(oldestTime).toISOString() : undefined,
        newestCache: newestFile ? new Date(newestTime).toISOString() : undefined
      };
    } catch (error) {
      console.error(`❌ Error getting cache stats:`, error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}