/**
 * File-based Feed Manager
 * Manages RSS feeds using feeds.json file instead of database
 */

import fs from 'fs/promises';
import path from 'path';

export interface Feed {
  id: string;
  originalUrl: string;
  type: 'album' | 'publisher';
  title: string;
  priority: 'core' | 'extended' | 'low';
  status: 'active' | 'inactive';
  addedAt: string;
  lastUpdated: string;
  source?: 'manual' | 'recursive';
  discoveredFrom?: string;
}

const FEEDS_FILE = path.join(process.cwd(), 'data', 'feeds.json');

async function readFeedsFile(): Promise<string[]> {
  try {
    const content = await fs.readFile(FEEDS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Support both array format and object with feeds property (backward compatibility)
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If it's an object with feeds property, extract the array
    if (parsed && Array.isArray(parsed.feeds)) {
      return parsed.feeds;
    }
    return [];
  } catch (error) {
    // If file doesn't exist or is invalid, return empty feeds
    console.warn('Feeds file not found or invalid, using empty feeds:', error);
    return [];
  }
}

async function writeFeedsFile(feeds: string[]): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(FEEDS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Write file as simple JSON array with pretty formatting
    await fs.writeFile(FEEDS_FILE, JSON.stringify(feeds, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write feeds file:', error);
    throw error;
  }
}

/**
 * Convert a URL string to a Feed object with auto-generated defaults
 */
function urlToFeed(url: string): Feed {
  const now = new Date().toISOString();
  // Generate ID from URL
  let feedId = url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  feedId = feedId.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (feedId.length > 200) {
    feedId = feedId.substring(0, 200).replace(/-$/, '');
  }
  
  // Extract a readable name from URL
  let title = `Feed from ${new URL(url).hostname}`;
  try {
    const urlPath = new URL(url).pathname;
    // Try to extract a name from the path (e.g., /feeds/my-album.xml -> "my-album")
    const pathParts = urlPath.split('/').filter(p => p);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      const nameWithoutExt = lastPart.replace(/\.(xml|rss)$/i, '');
      if (nameWithoutExt) {
        title = nameWithoutExt.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  } catch {
    // Use default title if URL parsing fails
  }
  
  return {
    id: feedId,
    originalUrl: url,
    type: 'album' as const, // Default to 'album', can be auto-detected later when feed is parsed
    title,
    priority: 'core' as const,
    status: 'active' as const,
    addedAt: now,
    lastUpdated: now,
    source: 'manual' as const
  };
}

/**
 * Get all feeds from feeds.json
 * Converts URL strings to Feed objects with auto-generated defaults
 */
export async function getAllFeeds(): Promise<Feed[]> {
  const feeds = await readFeedsFile();
  // Convert URL strings to Feed objects
  return feeds.map(url => urlToFeed(url));
}

/**
 * Add a new feed to feeds.json
 */
export async function addFeed(
  url: string,
  type: 'album' | 'publisher',
  title?: string,
  options?: {
    priority?: 'core' | 'extended' | 'low';
    source?: 'manual' | 'recursive';
    discoveredFrom?: string;
  }
): Promise<{ success: boolean; error?: string; feed?: Feed }> {
  try {
    const feeds = await readFeedsFile();
    
    // Check if feed already exists
    if (feeds.includes(url)) {
      return { success: false, error: 'Feed already exists' };
    }
    
    // Add as simple URL string
    feeds.push(url);
    await writeFeedsFile(feeds);
    
    // Return the Feed object representation for API compatibility
    return { success: true, feed: urlToFeed(url) };
  } catch (error) {
    console.error('Failed to add feed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Remove a feed from feeds.json
 */
export async function removeFeed(feedId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const feeds = await readFeedsFile();
    const initialLength = feeds.length;
    
    // Remove feed by matching the generated ID from any URL
    const filteredFeeds = feeds.filter(url => {
      const feedFromUrl = urlToFeed(url);
      return feedFromUrl.id !== feedId;
    });
    
    if (filteredFeeds.length === initialLength) {
      return { success: false, error: 'Feed not found' };
    }
    
    await writeFeedsFile(filteredFeeds);
    return { success: true };
  } catch (error) {
    console.error('Failed to remove feed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Initialize feeds file (creates file if it doesn't exist)
 * This replaces initializeDatabase for file-based approach
 */
export async function initializeFeeds(): Promise<boolean> {
  try {
    await readFeedsFile();
    // File exists and is valid
    return true;
  } catch (error) {
    // Create empty feeds file
    try {
      await writeFeedsFile([]);
      return true;
    } catch (writeError) {
      console.error('Failed to initialize feeds file:', writeError);
      return false;
    }
  }
}

