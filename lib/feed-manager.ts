import fs from 'fs';
import path from 'path';
import { RSSParser } from './rss-parser';

export interface Feed {
  id: string;
  originalUrl: string;
  type: 'album' | 'publisher';
  title: string;
  priority: 'core' | 'extended' | 'low';
  status: 'active' | 'inactive';
  addedAt: string;
  lastUpdated: string;
  source?: 'manual' | 'recursive'; // Track how the feed was discovered
  discoveredFrom?: string; // URL of the parent feed if discovered recursively
}

export interface FeedsData {
  feeds: Feed[];
  lastUpdated: string;
  version: number;
}

export class FeedManager {
  private static feedsData: FeedsData | null = null;
  private static readonly feedsPath = path.join(process.cwd(), 'data', 'feeds.json');

  /**
   * Clear the cached feeds data to force a reload
   */
  static clearCache(): void {
    this.feedsData = null;
  }

  /**
   * Load feeds from data/feeds.json
   * Supports multiple formats:
   * 1. Object format: { feeds: Feed[], lastUpdated: string, version: number }
   * 2. Array format: Feed[] (array of feed objects)
   * 3. Simple array: string[] (array of URLs - converts to Feed objects)
   */
  static loadFeeds(): FeedsData {
    if (this.feedsData) {
      return this.feedsData;
    }

    try {
      if (!fs.existsSync(this.feedsPath)) {
        console.warn('feeds.json not found, using empty feeds');
        const fallbackData = {
          feeds: [],
          lastUpdated: new Date().toISOString(),
          version: 1
        };
        this.feedsData = fallbackData;
        return fallbackData;
      }

      const feedsContent = fs.readFileSync(this.feedsPath, 'utf-8');
      const parsed = JSON.parse(feedsContent);
      
      // Handle different formats
      if (parsed && typeof parsed === 'object') {
        // Format 1: Full FeedsData object
        if (parsed.feeds && Array.isArray(parsed.feeds)) {
          this.feedsData = parsed as FeedsData;
          return this.feedsData;
        }
        
        // Format 2: Array of Feed objects
        if (Array.isArray(parsed)) {
          // Check if it's an array of Feed objects or URL strings
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            // Format 3: Array of URL strings - convert to Feed objects
            // Note: Type detection will happen asynchronously via detectAndUpdateFeedTypes()
            const feeds: Feed[] = parsed.map((url: string) => {
              const feedId = url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 200);
              const now = new Date().toISOString();
              return {
                id: feedId,
                originalUrl: url,
                type: 'album' as const, // Default to album, will be auto-detected if needed
                title: `Feed from ${new URL(url).hostname}`,
                priority: 'core' as const,
                status: 'active' as const,
                addedAt: now,
                lastUpdated: now,
                source: 'manual' as const
              };
            });
            
            this.feedsData = {
              feeds,
              lastUpdated: new Date().toISOString(),
              version: 1
            };
            return this.feedsData;
          } else {
            // Array of Feed objects
            this.feedsData = {
              feeds: parsed as Feed[],
              lastUpdated: new Date().toISOString(),
              version: 1
            };
            return this.feedsData;
          }
        }
      }
      
      // If we get here, format is unexpected
      console.warn('Unexpected feeds.json format, using empty feeds');
      const fallbackData = {
        feeds: [],
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      this.feedsData = fallbackData;
      return fallbackData;
    } catch (error) {
      console.error('Failed to load feeds from data/feeds.json:', error);
      // Return empty feeds as fallback
      const fallbackData = {
        feeds: [],
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      this.feedsData = fallbackData;
      return fallbackData;
    }
  }

  /**
   * Get all active feeds
   */
  static getActiveFeeds(): Feed[] {
    const feedsData = this.loadFeeds();
    return feedsData.feeds.filter(feed => feed.status === 'active');
  }

  /**
   * Get feeds by priority
   */
  static getFeedsByPriority(priority: 'core' | 'extended' | 'low'): Feed[] {
    return this.getActiveFeeds().filter(feed => feed.priority === priority);
  }

  /**
   * Get feeds by type
   */
  static getFeedsByType(type: 'album' | 'publisher'): Feed[] {
    return this.getActiveFeeds().filter(feed => feed.type === type);
  }

  /**
   * Get feed URLs in the format expected by the app (for backwards compatibility)
   */
  static getFeedUrlMappings(): [string, string][] {
    const activeFeeds = this.getActiveFeeds();
    return activeFeeds.map(feed => [feed.originalUrl, feed.type]);
  }

  /**
   * Get album feed URLs only
   */
  static getAlbumFeeds(): string[] {
    return this.getFeedsByType('album').map(feed => feed.originalUrl);
  }

  /**
   * Get publisher feed URLs only
   */
  static getPublisherFeeds(): string[] {
    return this.getFeedsByType('publisher').map(feed => feed.originalUrl);
  }

  /**
   * Get core feeds (for immediate loading)
   */
  static getCoreFeeds(): string[] {
    return this.getFeedsByPriority('core').map(feed => feed.originalUrl);
  }

  /**
   * Get extended feeds (for secondary loading)
   */
  static getExtendedFeeds(): string[] {
    return this.getFeedsByPriority('extended').map(feed => feed.originalUrl);
  }

  /**
   * Get low priority feeds (for final loading)
   */
  static getLowPriorityFeeds(): string[] {
    return this.getFeedsByPriority('low').map(feed => feed.originalUrl);
  }

  /**
   * Add a new feed to the feeds.json file
   */
  static addFeed(feed: Omit<Feed, 'addedAt' | 'lastUpdated'>): void {
    const feedsData = this.loadFeeds();
    const newFeed: Feed = {
      ...feed,
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    feedsData.feeds.push(newFeed);
    feedsData.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(this.feedsPath, JSON.stringify(feedsData, null, 2));
    this.feedsData = feedsData; // Update cache
  }

  /**
   * Update an existing feed
   */
  static updateFeed(id: string, updates: Partial<Feed>): void {
    const feedsData = this.loadFeeds();
    const feedIndex = feedsData.feeds.findIndex(feed => feed.id === id);
    
    if (feedIndex !== -1) {
      feedsData.feeds[feedIndex] = {
        ...feedsData.feeds[feedIndex],
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      feedsData.lastUpdated = new Date().toISOString();
      
      fs.writeFileSync(this.feedsPath, JSON.stringify(feedsData, null, 2));
      this.feedsData = feedsData; // Update cache
    }
  }

  /**
   * Remove a feed
   */
  static removeFeed(id: string): void {
    const feedsData = this.loadFeeds();
    feedsData.feeds = feedsData.feeds.filter(feed => feed.id !== id);
    feedsData.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(this.feedsPath, JSON.stringify(feedsData, null, 2));
    this.feedsData = feedsData; // Update cache
  }

  /**
   * Detect and update feed types for feeds that are still set to default 'album' type
   * This is called asynchronously to auto-detect publisher feeds
   */
  static async detectAndUpdateFeedTypes(): Promise<void> {
    const feedsData = this.loadFeeds();
    let hasUpdates = false;
    
    // Only check feeds that are still set to 'album' type (might be undetected publisher feeds)
    const feedsToCheck = feedsData.feeds.filter(feed => feed.type === 'album' && feed.status === 'active');
    
    if (feedsToCheck.length === 0) {
      return; // No feeds to check
    }
    
    console.log(`🔍 Auto-detecting feed types for ${feedsToCheck.length} feeds...`);
    
    // Check each feed type (with rate limiting to avoid overwhelming servers)
    for (let i = 0; i < feedsToCheck.length; i++) {
      const feed = feedsToCheck[i];
      
      try {
        const detectedType = await RSSParser.detectFeedType(feed.originalUrl);
        
        if (detectedType !== feed.type) {
          console.log(`✅ Detected ${detectedType} feed: ${feed.originalUrl}`);
          feed.type = detectedType;
          feed.lastUpdated = new Date().toISOString();
          hasUpdates = true;
        }
        
        // Small delay between requests to avoid overwhelming servers
        if (i < feedsToCheck.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`❌ Error detecting type for feed ${feed.originalUrl}:`, error);
        // Continue with other feeds even if one fails
      }
    }
    
    // Save updates if any were made
    if (hasUpdates) {
      feedsData.lastUpdated = new Date().toISOString();
      
      // Ensure we're saving in the correct format (object with feeds array)
      const dataToSave: FeedsData = {
        feeds: feedsData.feeds,
        lastUpdated: feedsData.lastUpdated,
        version: feedsData.version || 1
      };
      
      fs.writeFileSync(this.feedsPath, JSON.stringify(dataToSave, null, 2));
      this.feedsData = dataToSave; // Update cache
      
      // Verify the save worked
      const savedData = JSON.parse(fs.readFileSync(this.feedsPath, 'utf-8'));
      const publisherCount = savedData.feeds?.filter((f: Feed) => f.type === 'publisher').length || 0;
      console.log(`💾 Updated feed types in feeds.json (${publisherCount} publisher feed(s) now detected)`);
    } else {
      console.log('ℹ️ No feed type updates needed');
    }
  }
}