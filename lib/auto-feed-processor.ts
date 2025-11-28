// Automatic feed processor that watches feeds.json and processes new feeds
// This runs automatically when feeds are added to feeds.json

import fs from 'fs';
import path from 'path';
import { FeedManager } from './feed-manager';
import { AlbumsService } from './albums-service';

const FEEDS_FILE = path.join(process.cwd(), 'data', 'feeds.json');
let lastProcessedFeeds: string[] = [];
let isProcessing = false;
let processingTimeout: NodeJS.Timeout | null = null;

/**
 * Get current feeds from feeds.json
 */
function getCurrentFeeds(): string[] {
  try {
    if (!fs.existsSync(FEEDS_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(FEEDS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    
    // FeedManager uses object format with feeds array
    if (parsed && Array.isArray(parsed.feeds)) {
      // Extract URLs from feed objects
      return parsed.feeds
        .filter((f: any) => f.status === 'active') // Only active feeds
        .map((f: any) => f.originalUrl || f.url || '');
    }
    
    // Fallback: support simple array format (for feeds-manager.ts compatibility)
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.warn('Failed to read feeds.json:', error);
    return [];
  }
}

/**
 * Check if there are new feeds that need processing
 */
function hasNewFeeds(): boolean {
  const currentFeeds = getCurrentFeeds();
  
  // First run - process all feeds
  if (lastProcessedFeeds.length === 0) {
    lastProcessedFeeds = [...currentFeeds];
    return currentFeeds.length > 0;
  }
  
  // Check if any new feeds were added
  const newFeeds = currentFeeds.filter(feed => !lastProcessedFeeds.includes(feed));
  
  if (newFeeds.length > 0) {
    console.log(`🆕 Detected ${newFeeds.length} new feed(s):`, newFeeds);
    lastProcessedFeeds = [...currentFeeds];
    return true;
  }
  
  return false;
}

/**
 * Process all feeds automatically (parse, extract colors, and save static data)
 */
async function processFeeds(): Promise<void> {
  if (isProcessing) {
    console.log('⏳ Feed processing already in progress, skipping...');
    return;
  }
  
  isProcessing = true;
  
  try {
    console.log('🚀 Auto-processing feeds from feeds.json...');
    
    // Parse feeds and extract colors using AlbumsService
    // This will automatically extract colors during parsing
    const result = await AlbumsService.fetchAlbums({
      source: 'dynamic',
      forceRegenerate: true, // Force regeneration to process new feeds
      includeErrors: true,
    });
    
    console.log(`✅ Auto-processed ${result.count} album(s)`);
    
    if (result.errors && result.errors.length > 0) {
      console.warn(`⚠️ ${result.errors.length} error(s) during processing`);
    }
    
    // Save full album data to static-albums.json (for static cached site)
    // Skip in serverless environments (read-only file system)
    if (!isServerless() && result.albums && result.albums.length > 0) {
      try {
        const staticDataPath = path.join(process.cwd(), 'public', 'static-albums.json');
        const staticData = {
          albums: result.albums,
          count: result.count,
          timestamp: result.timestamp,
          source: result.source,
          generated: true,
          generatedAt: new Date().toISOString(),
          ...(result.errors && result.errors.length > 0 && { errors: result.errors }),
        };
        
        // Ensure directory exists
        const dir = path.dirname(staticDataPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write static album data
        fs.writeFileSync(staticDataPath, JSON.stringify(staticData, null, 2), 'utf-8');
        console.log(`💾 Saved ${result.count} album(s) to static-albums.json`);
      } catch (saveError) {
        console.warn('⚠️ Failed to save static album data:', saveError);
      }
    } else if (isServerless()) {
      console.log('☁️ Serverless environment - skipping file writes (read-only filesystem)');
    }
    
    console.log('🎨 Colors extracted and saved to albums-with-colors.json');
    console.log('📦 Full album data saved to static-albums.json');
    
  } catch (error) {
    console.error('❌ Error auto-processing feeds:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Check if we're in a serverless environment (Vercel, etc.)
 */
function isServerless(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.RAILWAY_ENVIRONMENT
  );
}

/**
 * Watch feeds.json for changes and auto-process
 */
export function startAutoFeedProcessor(): void {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    return;
  }
  
  // Skip file watching in serverless environments (Vercel, etc.)
  // File watching doesn't work in serverless, and file writes are read-only
  if (isServerless()) {
    console.log('☁️ Serverless environment detected - skipping file watcher');
    console.log('📝 Feeds will be processed on-demand via API calls');
    // Still initialize feeds list for reference
    lastProcessedFeeds = getCurrentFeeds();
    return;
  }
  
  console.log('👀 Starting auto feed processor...');
  
  // Initial check
  if (hasNewFeeds()) {
    // Delay initial processing to avoid startup race conditions
    setTimeout(() => {
      processFeeds().catch(console.error);
    }, 2000);
  } else {
    // Initialize last processed feeds
    lastProcessedFeeds = getCurrentFeeds();
    console.log(`📋 Monitoring ${lastProcessedFeeds.length} existing feed(s)`);
  }
  
  // Watch for file changes (only in non-serverless environments)
  try {
    const feedsDir = path.dirname(FEEDS_FILE);
    
    // Ensure directory exists
    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true });
    }
    
    // Watch the feeds.json file
    fs.watchFile(FEEDS_FILE, { interval: 1000 }, (curr, prev) => {
      // Check if file was actually modified (not just accessed)
      if (curr.mtimeMs !== prev.mtimeMs) {
        console.log('📝 feeds.json changed, checking for new feeds...');
        
        // Debounce: wait 2 seconds after last change before processing
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }
        
        processingTimeout = setTimeout(() => {
          if (hasNewFeeds()) {
            processFeeds().catch(console.error);
          }
        }, 2000);
      }
    });
    
    console.log('✅ Auto feed processor started - watching feeds.json');
  } catch (error) {
    console.error('❌ Failed to start file watcher:', error);
    console.log('⚠️ Auto-processing disabled. Feeds will need manual processing.');
  }
}

/**
 * Stop the auto feed processor
 */
export function stopAutoFeedProcessor(): void {
  if (processingTimeout) {
    clearTimeout(processingTimeout);
    processingTimeout = null;
  }
  
  try {
    fs.unwatchFile(FEEDS_FILE);
    console.log('🛑 Auto feed processor stopped');
  } catch (error) {
    // Ignore errors when stopping
  }
}

/**
 * Manually trigger feed processing
 */
export async function triggerFeedProcessing(): Promise<void> {
  lastProcessedFeeds = getCurrentFeeds();
  await processFeeds();
}

