#!/usr/bin/env tsx

/**
 * Build-time RSS Feed Parser
 * Parses RSS feeds during Vercel build and generates static album data
 * This runs before Next.js build to ensure static data is available
 * 
 * Uses AlbumsService to leverage existing RSS parsing logic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AlbumsService } from '../lib/albums-service';
import { FeedManager } from '../lib/feed-manager';
import { RSSParser } from '../lib/rss-parser';
import { cleanAlbumImages } from '../lib/image-utils';
import { extractColorsFromImageServer } from '../lib/color-extraction-server';
import { batchUpdateAlbumColors, AlbumWithColors } from '../lib/color-storage';
import type { ExtractedColors } from '../lib/color-utils';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find project root
function findProjectRoot(): string {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return currentDir;
}

async function buildRSSData(): Promise<void> {
  console.log('🚀 Building RSS feed data during build...');
  
  const projectRoot = findProjectRoot();
  process.chdir(projectRoot);
  
  try {
    console.log('📡 Parsing RSS feeds from feeds.json...');
    
    // Step 0: Auto-detect feed types first (publisher feeds might still be marked as 'album')
    console.log('🔍 Auto-detecting feed types...');
    await FeedManager.detectAndUpdateFeedTypes();
    FeedManager.clearCache(); // Reload feeds with updated types
    
    // Step 1: Process publisher feeds and discover their remoteItems
    console.log('🏢 Discovering feeds from publisher feeds...');
    const feeds = FeedManager.getActiveFeeds();
    console.log(`📊 Total feeds loaded: ${feeds.length}`);
    console.log(`📊 Feed types: ${feeds.filter(f => f.type === 'album').length} album, ${feeds.filter(f => f.type === 'publisher').length} publisher`);
    
    const publisherFeeds = feeds.filter(feed => feed.type === 'publisher');
    
    if (publisherFeeds.length === 0) {
      console.log('ℹ️ No publisher feeds found (or not yet detected)');
      console.log('💡 All feeds will be processed as albums');
    } else {
      console.log(`✅ Found ${publisherFeeds.length} publisher feed(s) to process`);
    }
    
    let discoveredFeeds: string[] = [];
    let feedsUpdated = false;
    
    for (const publisherFeed of publisherFeeds) {
      try {
        console.log(`🔍 Processing publisher feed: ${publisherFeed.title} (${publisherFeed.originalUrl})`);
        
        // Parse publisher feed to get remoteItems
        const publisherItems = await RSSParser.parsePublisherFeed(publisherFeed.originalUrl);
        
        if (publisherItems && publisherItems.length > 0) {
          console.log(`📋 Found ${publisherItems.length} remoteItems in publisher feed`);
          
          // Get current feeds to check for duplicates
          const currentFeeds = FeedManager.getActiveFeeds();
          const existingUrls = new Set(currentFeeds.map(f => f.originalUrl));
          
          // Add remoteItems that aren't already in feeds.json
          for (const item of publisherItems) {
            if (item.feedUrl && item.medium === 'music' && !existingUrls.has(item.feedUrl)) {
              console.log(`➕ Adding discovered feed: ${item.title || item.feedUrl}`);
              discoveredFeeds.push(item.feedUrl);
              
              // Add feed to FeedManager
              FeedManager.addFeed({
                id: item.feedGuid || item.feedUrl.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 200),
                originalUrl: item.feedUrl,
                type: 'album',
                title: item.title || `Feed from ${new URL(item.feedUrl).hostname}`,
                priority: 'extended',
                status: 'active',
                source: 'recursive',
                discoveredFrom: publisherFeed.originalUrl
              });
              
              existingUrls.add(item.feedUrl); // Prevent duplicates in same run
              feedsUpdated = true;
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error processing publisher feed ${publisherFeed.originalUrl}:`, error instanceof Error ? error.message : error);
        // Continue with other publisher feeds
      }
    }
    
    if (feedsUpdated) {
      console.log(`✅ Added ${discoveredFeeds.length} new feed(s) from publisher feeds`);
      console.log(`📋 Discovered feeds: ${discoveredFeeds.join(', ')}`);
      
      // Clear cache to reload feeds with newly added ones
      FeedManager.clearCache();
      
      // Verify the feeds were actually added
      const reloadedFeeds = FeedManager.getActiveFeeds();
      const addedCount = discoveredFeeds.filter(url => 
        reloadedFeeds.some(f => f.originalUrl === url)
      ).length;
      
      if (addedCount === discoveredFeeds.length) {
        console.log(`✅ Verified: All ${addedCount} discovered feeds are now in feeds.json`);
      } else {
        console.warn(`⚠️ Warning: Only ${addedCount} of ${discoveredFeeds.length} discovered feeds were found after reload`);
      }
    } else {
      console.log('ℹ️ No new feeds discovered from publisher feeds');
    }
    
    // Step 2: Load all feeds (including newly discovered ones) and parse album feeds
    FeedManager.clearCache(); // Ensure we have fresh data
    const allFeeds = FeedManager.getActiveFeeds();
    console.log(`📊 Total feeds after discovery: ${allFeeds.length} (${allFeeds.filter(f => f.type === 'album').length} album, ${allFeeds.filter(f => f.type === 'publisher').length} publisher)`);
    
    // Explicitly filter out publisher feeds - defensive check
    const albumFeeds = allFeeds.filter(feed => {
      if (feed.type === 'publisher') {
        console.log(`⏭️ Skipping publisher feed: ${feed.title} (${feed.originalUrl})`);
        return false;
      }
      return feed.type === 'album';
    });
    
    // Log what we're about to process
    const publisherFeedsInList = allFeeds.filter(f => f.type === 'publisher');
    if (publisherFeedsInList.length > 0) {
      console.log(`ℹ️ Found ${publisherFeedsInList.length} publisher feed(s) - these will NOT be parsed as albums`);
      publisherFeedsInList.forEach(pf => {
        console.log(`   - ${pf.title} (${pf.originalUrl})`);
      });
    }
    
    if (albumFeeds.length === 0) {
      console.log('⚠️ No album feeds found in feeds.json');
      const emptyData = {
        albums: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'build-time',
        generated: true,
        generatedAt: new Date().toISOString()
      };
      const staticPath = path.join(projectRoot, 'public', 'static-albums.json');
      fs.mkdirSync(path.dirname(staticPath), { recursive: true });
      fs.writeFileSync(staticPath, JSON.stringify(emptyData, null, 2), 'utf-8');
      console.log('✅ Created empty static-albums.json');
      return;
    }
    
    console.log(`📡 Processing ${albumFeeds.length} album feed(s)...`);
    
    const albums = [];
    const errors: Array<{ feedId: string; error: string }> = [];
    const albumsWithColors: AlbumWithColors[] = [];
    
    // Parse each feed
    for (const feed of albumFeeds) {
      try {
        // Defensive check: double-verify this is not a publisher feed
        if (feed.type === 'publisher') {
          console.log(`⚠️ Skipping feed marked as publisher: ${feed.title} (${feed.originalUrl})`);
          continue;
        }
        
        // Additional safety check: verify URL doesn't match known publisher feed patterns
        if (feed.originalUrl.includes('pubfeed') || feed.originalUrl.includes('publisher')) {
          console.log(`⚠️ Skipping feed with publisher-like URL: ${feed.title} (${feed.originalUrl})`);
          continue;
        }
        
        console.log(`🎵 Parsing: ${feed.title} (${feed.originalUrl})`);
        
        if (!feed.originalUrl || typeof feed.originalUrl !== 'string') {
          throw new Error(`Invalid feed URL: ${feed.originalUrl}`);
        }
        
        // Add delay for Wavlake feeds to avoid rate limiting
        if (feed.originalUrl.includes('wavlake.com')) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Parse RSS feed with timeout (30 seconds for build)
        const timeoutMs = 30000;
        const parsePromise = RSSParser.parseAlbumFeed(feed.originalUrl);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`RSS parsing timeout after ${timeoutMs/1000} seconds`)), timeoutMs)
        );
        
        const albumData = await Promise.race([parsePromise, timeoutPromise]) as any;
        
        if (albumData) {
          // Clean image URLs
          cleanAlbumImages(albumData);
          
          // Add feed metadata
          const enrichedAlbum = {
            ...albumData,
            feedId: feed.id,
            feedUrl: feed.originalUrl,
            lastUpdated: feed.lastUpdated || new Date().toISOString(),
          };
          
          albums.push(enrichedAlbum);
          
          // Prepare color data structure
          const albumWithColors: AlbumWithColors = {
            title: albumData.title,
            artist: albumData.artist,
            coverArt: albumData.coverArt,
          };
          
          // Extract colors from album cover art (as specified in plan)
          if (albumData.coverArt) {
            try {
              console.log(`🎨 Extracting colors from album cover: ${albumData.title}`);
              const colors = await extractColorsFromImageServer(albumData.coverArt);
              if (colors) {
                albumWithColors.colors = colors;
              }
            } catch (colorError) {
              // Don't fail build if color extraction fails - just log warning
              console.warn(`⚠️ Failed to extract colors for ${albumData.title}:`, colorError instanceof Error ? colorError.message : colorError);
            }
          }
          
          albumsWithColors.push(albumWithColors);
          console.log(`✅ Parsed: ${albumData.title}`);
        } else {
          console.warn(`⚠️ No data returned for ${feed.title}`);
          errors.push({
            feedId: feed.id,
            error: 'No album data returned'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error parsing ${feed.title} (${feed.originalUrl}):`, errorMessage);
        errors.push({
          feedId: feed.id || feed.originalUrl || 'unknown',
          error: errorMessage
        });
      }
    }
    
    // Save static album data
    const staticData = {
      albums,
      count: albums.length,
      timestamp: new Date().toISOString(),
      source: 'build-time-rss-parse',
      generated: true,
      generatedAt: new Date().toISOString(),
      ...(errors.length > 0 && { errors })
    };
    
    const staticPath = path.join(projectRoot, 'public', 'static-albums.json');
    fs.mkdirSync(path.dirname(staticPath), { recursive: true });
    fs.writeFileSync(staticPath, JSON.stringify(staticData, null, 2), 'utf-8');
    console.log(`💾 Saved ${albums.length} album(s) to static-albums.json`);
    
    // Save color data (even if empty, so the file exists)
    if (albumsWithColors.length > 0) {
      try {
        batchUpdateAlbumColors(albumsWithColors);
        console.log(`✅ Saved color data for ${albumsWithColors.length} album(s) to albums-with-colors.json`);
      } catch (colorError) {
        console.warn('⚠️ Failed to save color data:', colorError);
      }
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} feed(s) had errors during parsing`);
      errors.forEach(err => {
        console.warn(`  - ${err.feedId}: ${err.error}`);
      });
    }
    
    console.log(`🎉 Build-time RSS parsing complete: ${albums.length} albums`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Failed to build RSS data:', errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }
    
    // Create empty static files so build doesn't fail completely
    const emptyAlbums = {
      albums: [],
      count: 0,
      timestamp: new Date().toISOString(),
      source: 'build-time-error',
      generated: true,
      generatedAt: new Date().toISOString(),
      error: errorMessage
    };
    
    const staticPath = path.join(projectRoot, 'public', 'static-albums.json');
    fs.mkdirSync(path.dirname(staticPath), { recursive: true });
    fs.writeFileSync(staticPath, JSON.stringify(emptyAlbums, null, 2));
    console.log('⚠️ Created empty static-albums.json due to build error');
    console.log('💡 The site will still work, but albums will need to be parsed on-demand');
    
    // Don't throw - allow build to continue
    process.exit(0);
  }
}

// Run if called directly (tsx executes this file directly)
buildRSSData().catch(error => {
  console.error('❌ Unhandled error in build-rss-data:', error);
  process.exit(0); // Exit with 0 so build doesn't fail
});

export { buildRSSData };

