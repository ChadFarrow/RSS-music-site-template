import fs from 'fs';
import path from 'path';
import { FeedManager } from './feed-manager';
import { RSSParser } from './rss-parser';
import { getAllFeeds, initializeFeeds } from './feeds-manager';
import { cleanAlbumImages } from './image-utils';
import { extractColorsFromImageServer } from './color-extraction-server';
import { batchUpdateAlbumColors, AlbumWithColors } from './color-storage';
import type { ExtractedColors } from './color-utils';

/**
 * Albums data source types
 */
export type AlbumsDataSource = 
  | 'static'           // Pre-generated static file (static-albums.json)
  | 'static-cached'    // Pre-generated cached file (albums-static-cached.json)
  | 'dynamic'          // Parse from FeedManager (no database)
  | 'database'         // Parse from database feeds
  | 'auto';            // Try static first, fallback to dynamic

/**
 * Options for fetching albums
 */
export interface AlbumsFetchOptions {
  /** Data source to use */
  source?: AlbumsDataSource;
  /** Force regeneration (ignores cache) */
  forceRegenerate?: boolean;
  /** Clear cache */
  clearCache?: boolean;
  /** Priority filter for feeds */
  priority?: 'core' | 'extended' | 'low';
  /** Whether to include errors in response */
  includeErrors?: boolean;
}

/**
 * Albums fetch result
 */
export interface AlbumsResult {
  albums: any[];
  count: number;
  errors?: Array<{ feedId: string; error: string }>;
  timestamp: string;
  source?: string;
  cached?: boolean;
  static?: boolean;
  fallback?: boolean;
  cacheAge?: number;
}

/**
 * Unified Albums Service
 * Consolidates all albums data fetching logic from various sources
 */
export class AlbumsService {
  // Lazy getters for paths to avoid issues during module initialization
  private static get STATIC_DATA_PATH(): string {
    try {
      return path.join(process.cwd(), 'public', 'static-albums.json');
    } catch {
      return 'public/static-albums.json';
    }
  }
  
  private static get STATIC_CACHED_PATH(): string {
    try {
      return path.join(process.cwd(), 'public', 'albums-static-cached.json');
    } catch {
      return 'public/albums-static-cached.json';
    }
  }
  
  // In-memory cache
  private static memoryCache: AlbumsResult | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch albums based on source type
   */
  static async fetchAlbums(options: AlbumsFetchOptions = {}): Promise<AlbumsResult> {
    try {
      const {
        source = 'auto',
        forceRegenerate = false,
        clearCache = false,
        priority,
        includeErrors = true,
      } = options;

      // Handle cache clearing
      if (clearCache) {
        this.memoryCache = null;
        this.cacheTimestamp = 0;
        console.log('🗑️ Cleared in-memory cache');
      }

      // Check memory cache (unless forced regeneration)
      if (!forceRegenerate && this.memoryCache && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL) {
        console.log('📦 Serving cached albums data');
        return {
          ...this.memoryCache,
          cached: true,
          cacheAge: Math.round((Date.now() - this.cacheTimestamp) / 1000),
        };
      }

      // Route to appropriate data source
      let result: AlbumsResult;
      switch (source) {
        case 'static':
          result = await this.fetchFromStaticFile();
          break;
        case 'static-cached':
          result = await this.fetchFromStaticCachedFile();
          break;
        case 'dynamic':
          result = await this.fetchFromFeedManager(priority, includeErrors);
          break;
        case 'database':
          result = await this.fetchFromDatabase(includeErrors);
          break;
        case 'auto':
        default:
          result = await this.fetchAuto(forceRegenerate, priority, includeErrors);
          break;
      }
      
      return result;
    } catch (error) {
      // Always return a valid result, never throw
      console.error('❌ AlbumsService.fetchAlbums error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        albums: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'error-fallback',
        errors: [{
          feedId: 'system',
          error: errorMessage
        }],
      };
    }
  }

  /**
   * Fetch from static-albums.json file
   * In Vercel, public files are static assets, so we need to fetch via HTTP
   */
  private static async fetchFromStaticFile(): Promise<AlbumsResult> {
    // In serverless environments (Vercel), public files are static assets
    // Try to read from file system first (works in build/dev)
    try {
      if (typeof fs !== 'undefined' && fs.existsSync && typeof fs.existsSync === 'function') {
        if (fs.existsSync(this.STATIC_DATA_PATH)) {
          try {
            const staticData = JSON.parse(fs.readFileSync(this.STATIC_DATA_PATH, 'utf8'));
            console.log(`📦 Loaded ${staticData.albums?.length || 0} albums from static file (filesystem)`);
            return {
              albums: staticData.albums || [],
              count: staticData.albums?.length || 0,
              timestamp: new Date().toISOString(),
              source: 'static-file',
              static: true,
            };
          } catch (readError) {
            console.warn('⚠️ Failed to read static file from filesystem:', readError instanceof Error ? readError.message : readError);
          }
        }
      }
    } catch (fsError) {
      // fs might not be available in some environments
      console.warn('⚠️ Filesystem check failed (expected in serverless):', fsError instanceof Error ? fsError.message : fsError);
    }
    
    // Fallback: Try to fetch via HTTP (for Vercel serverless)
    // This works because public/ files are served as static assets
    // Only try HTTP fetch in serverless environments to avoid circular dependencies
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      try {
        // Try multiple ways to get the base URL
        let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        
        if (!baseUrl && process.env.VERCEL_URL) {
          baseUrl = `https://${process.env.VERCEL_URL}`;
        }
        
        if (baseUrl) {
          // Use a timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            const response = await fetch(`${baseUrl}/static-albums.json`, {
              cache: 'no-store',
              signal: controller.signal,
              headers: {
                'User-Agent': 'AlbumsService/1.0'
              }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const staticData = await response.json();
              console.log(`📦 Loaded ${staticData.albums?.length || 0} albums from static file via HTTP`);
              return {
                albums: staticData.albums || [],
                count: staticData.albums?.length || 0,
                timestamp: new Date().toISOString(),
                source: 'static-file-http',
                static: true,
              };
            } else {
              console.warn(`⚠️ Static file HTTP fetch returned ${response.status}: ${response.statusText}`);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.warn('⚠️ Static file HTTP fetch timed out after 5 seconds');
            } else {
              console.warn('⚠️ Failed to fetch static file via HTTP:', fetchError instanceof Error ? fetchError.message : fetchError);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error in HTTP fetch attempt:', error instanceof Error ? error.message : error);
      }
    }

    // Return empty result - don't throw, allow fallback to dynamic parsing
    console.log('⚠️ Static file not available, will fallback to dynamic parsing');
    return {
      albums: [],
      count: 0,
      timestamp: new Date().toISOString(),
      static: false,
      fallback: true,
    };
  }

  /**
   * Fetch from albums-static-cached.json file
   * In Vercel, public files are static assets, so we need to fetch via HTTP
   */
  private static async fetchFromStaticCachedFile(): Promise<AlbumsResult> {
    try {
      // In serverless environments (like Vercel), use HTTP fetch
      const isServerless = typeof process !== 'undefined' && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
      
      if (isServerless) {
        try {
          // Try to fetch via HTTP (public files are served as static assets)
          let baseUrl: string;
          if (process.env.NEXT_PUBLIC_SITE_URL) {
            try {
              const url = new URL(process.env.NEXT_PUBLIC_SITE_URL);
              baseUrl = url.origin;
            } catch {
              baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            }
          } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`;
          } else {
            baseUrl = 'http://localhost:3000';
          }
          
          const url = `${baseUrl}/albums-static-cached.json`;
          
          const response = await Promise.race([
            fetch(url, {
              cache: 'no-store',
              signal: AbortSignal.timeout(5000), // 5 second timeout
            }),
            new Promise<Response>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]) as Response;

          if (response.ok) {
            const staticData = await response.json();
            return {
              albums: staticData.albums || staticData.metadata?.albums || [],
              count: staticData.count || staticData.albums?.length || 0,
              timestamp: new Date().toISOString(),
              source: 'static-cached-file',
              static: true,
            };
          } else {
            console.warn(`⚠️ Static cached file returned ${response.status}, falling back to empty result`);
          }
        } catch (error) {
          // Silently handle errors - this is expected if file doesn't exist
          console.warn('⚠️ Static cached file not available via HTTP (this is normal if file doesn\'t exist):', error instanceof Error ? error.message : String(error));
        }
      } else {
        // In non-serverless environments, use file system
        try {
          if (fs.existsSync(this.STATIC_CACHED_PATH)) {
            const staticData = JSON.parse(fs.readFileSync(this.STATIC_CACHED_PATH, 'utf-8'));
            return {
              albums: staticData.albums || staticData.metadata?.albums || [],
              count: staticData.count || staticData.albums?.length || 0,
              timestamp: new Date().toISOString(),
              source: 'static-cached-file',
              static: true,
            };
          }
        } catch (error) {
          console.warn('⚠️ Error reading static cached file:', error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      // Catch any unexpected errors and return empty result
      console.warn('⚠️ Unexpected error in fetchFromStaticCachedFile:', error instanceof Error ? error.message : String(error));
    }

    // Return empty result - don't throw, allow fallback to other sources
    return {
      albums: [],
      count: 0,
      timestamp: new Date().toISOString(),
      source: 'static-cached-file',
      static: false,
      fallback: true,
    };
  }

  /**
   * Fetch by parsing feeds from FeedManager (no database)
   */
  private static async fetchFromFeedManager(
    priority?: 'core' | 'extended' | 'low',
    includeErrors = true
  ): Promise<AlbumsResult> {
    console.log('🔄 Parsing albums without database dependency...');

    try {
      let feeds;
      try {
        feeds = FeedManager.getActiveFeeds();
      } catch (feedManagerError) {
        console.error('❌ FeedManager.getActiveFeeds() threw an error:', feedManagerError);
        // Return empty result instead of throwing
        return {
          albums: [],
          count: 0,
          timestamp: new Date().toISOString(),
          source: 'direct-rss-parsing',
          errors: includeErrors ? [{
            feedId: 'system',
            error: `FeedManager error: ${feedManagerError instanceof Error ? feedManagerError.message : String(feedManagerError)}`
          }] : undefined,
        };
      }
      if (!feeds || feeds.length === 0) {
        console.warn('⚠️ No active feeds found, returning empty result');
        // Try static file as fallback before returning empty
        const staticResult = await this.fetchFromStaticFile();
        if (staticResult.albums.length > 0) {
          console.log('📦 Found static file as fallback');
          return {
            ...staticResult,
            fallback: true,
            errors: includeErrors ? [{ feedId: 'none', error: 'No active feeds found, using static file' }] : undefined,
          };
        }
        return {
          albums: [],
          count: 0,
          timestamp: new Date().toISOString(),
          source: 'dynamic',
          errors: includeErrors ? [{ feedId: 'none', error: 'No active feeds found' }] : undefined,
        };
      }
      
      let albumFeeds = feeds.filter(feed => feed.type === 'album');

      // Filter by priority if specified
      if (priority) {
        albumFeeds = albumFeeds.filter(feed => feed.priority === priority);
      }

      console.log(`📡 Processing ${albumFeeds.length} album feeds...`);

      if (albumFeeds.length === 0) {
        console.warn('⚠️ No album feeds found, trying static file fallback');
        // Try static file as fallback before returning empty
        const staticResult = await this.fetchFromStaticFile();
        if (staticResult.albums.length > 0) {
          console.log('📦 Found static file as fallback');
          return {
            ...staticResult,
            fallback: true,
            errors: includeErrors ? [{ feedId: 'none', error: 'No album feeds found, using static file' }] : undefined,
          };
        }
        return {
          albums: [],
          count: 0,
          timestamp: new Date().toISOString(),
          source: 'dynamic',
          errors: includeErrors ? [{ feedId: 'none', error: 'No album feeds found' }] : undefined,
        };
      }

      const albums = [];
      const errors: Array<{ feedId: string; error: string }> = [];
      const albumsWithColors: AlbumWithColors[] = [];

      for (const feed of albumFeeds) {
        try {
          console.log(`🎵 Parsing: ${feed.title} (${feed.originalUrl})`);

          // Validate feed URL
          if (!feed.originalUrl || typeof feed.originalUrl !== 'string') {
            throw new Error(`Invalid feed URL: ${feed.originalUrl}`);
          }

          // Add delay for Wavlake feeds to avoid rate limiting
          if (feed.originalUrl.includes('wavlake.com')) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Parse RSS feed with timeout protection
          let albumData;
          try {
            // Use a shorter timeout for serverless environments (10 seconds)
            const timeoutMs = process.env.VERCEL ? 10000 : 30000;
            const parsePromise = RSSParser.parseAlbumFeed(feed.originalUrl);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`RSS parsing timeout after ${timeoutMs/1000} seconds`)), timeoutMs)
            );
            
            albumData = await Promise.race([parsePromise, timeoutPromise]) as any;
          } catch (parseError) {
            throw parseError;
          }

          if (albumData) {
            // Clean image URLs
            cleanAlbumImages(albumData);

            // Add feed metadata
            const enrichedAlbum = {
              ...albumData,
              feedId: feed.id,
              feedUrl: feed.originalUrl,
              lastUpdated: feed.lastUpdated,
            };

            albums.push(enrichedAlbum);
            
            // Extract colors from album artwork (for static cached site)
            const albumWithColors: AlbumWithColors = {
              title: albumData.title,
              artist: albumData.artist,
            };
            
            // Extract album cover art colors
            if (albumData.coverArt) {
              console.log(`🎨 Extracting colors from album cover: ${albumData.title}`);
              try {
                const colors = await extractColorsFromImageServer(albumData.coverArt);
                if (colors) {
                  albumWithColors.colors = colors;
                }
              } catch (colorError) {
                console.warn(`⚠️ Failed to extract colors for ${albumData.title}:`, colorError);
              }
            }
            
            // Extract colors from track images (limit to first 10 for performance)
            if (albumData.tracks && albumData.tracks.length > 0) {
              const trackColors: Array<{ title: string; image?: string; colors: ExtractedColors }> = [];
              
              for (const track of albumData.tracks.slice(0, 10)) {
                if (track.image && track.image !== albumData.coverArt) {
                  try {
                    const trackColor = await extractColorsFromImageServer(track.image);
                    if (trackColor) {
                      trackColors.push({
                        title: track.title,
                        image: track.image,
                        colors: trackColor,
                      });
                    }
                  } catch (colorError) {
                    // Silently skip track color extraction failures
                  }
                }
              }
              
              if (trackColors.length > 0) {
                albumWithColors.tracks = trackColors;
              }
            }
            
            albumsWithColors.push(albumWithColors);
            console.log(`✅ Parsed: ${albumData.title}`);
          } else {
            console.warn(`⚠️ No data returned for ${feed.title}`);
            if (includeErrors) {
              errors.push({
                feedId: feed.id,
                error: 'No album data returned',
              });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(`❌ Error parsing ${feed.title} (${feed.originalUrl}):`, errorMessage);
          if (errorStack) {
            console.error('Stack trace:', errorStack);
          }
          if (includeErrors) {
            errors.push({
              feedId: feed.id || feed.originalUrl || 'unknown',
              error: errorMessage,
            });
          }
          // Continue processing other feeds even if one fails
        }
      }
      
      // Save all extracted colors to albums-with-colors.json
      // Skip in serverless environments (read-only file system)
      if (albumsWithColors.length > 0 && typeof process !== 'undefined' && !process.env.VERCEL) {
        try {
          console.log(`💾 Saving colors for ${albumsWithColors.length} albums...`);
          batchUpdateAlbumColors(albumsWithColors);
          console.log(`✅ Saved colors to albums-with-colors.json`);
        } catch (colorSaveError) {
          console.warn('⚠️ Failed to save colors:', colorSaveError);
        }
      } else if (albumsWithColors.length > 0) {
        console.log('☁️ Serverless environment - skipping color file writes');
      }

      console.log(`🎉 Successfully parsed ${albums.length} albums (${errors.length} errors)`);

      // If we have no albums but have errors, return the errors
      if (albums.length === 0 && errors.length > 0) {
        console.error('❌ Failed to parse any albums. Errors:', errors);
      }

      const result: AlbumsResult = {
        albums,
        count: albums.length,
        timestamp: new Date().toISOString(),
        source: 'direct-rss-parsing',
      };

      if (includeErrors && errors.length > 0) {
        result.errors = errors;
      }

      // Cache the result
      this.memoryCache = result;
      this.cacheTimestamp = Date.now();

      return result;
    } catch (error) {
      console.error('❌ Error in albums fetch:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Error details:', { errorMessage, errorStack });
      
      // Return empty result with error instead of throwing
      return {
        albums: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'direct-rss-parsing',
        errors: includeErrors ? [{
          feedId: 'unknown',
          error: errorMessage
        }] : undefined,
      };
    }
  }

  /**
   * Fetch by parsing feeds from database
   */
  private static async fetchFromDatabase(includeErrors = true): Promise<AlbumsResult> {
    console.log('🔄 Fetching albums from database...');

    try {
      await initializeFeeds();
      const dbFeeds = await getAllFeeds();

      const albums = [];
      const errors: Array<{ feedId: string; error: string }> = [];
      let processed = 0;

      const albumsWithColors: AlbumWithColors[] = [];

      for (const feed of dbFeeds) {
        if (feed.status === 'active') {
          try {
            console.log(`🎵 Processing RSS feed ${++processed}/${dbFeeds.length}: ${feed.originalUrl}`);
            const album = await RSSParser.parseAlbumFeed(feed.originalUrl);

            if (album) {
              // Clean image URLs
              cleanAlbumImages(album);

              // Add feed metadata
              album.feedId = feed.id;
              album.feedUrl = feed.originalUrl;
              album.lastUpdated = typeof feed.lastUpdated === 'string' 
                ? feed.lastUpdated 
                : new Date().toISOString();
              albums.push(album);
              
              // Extract colors from album artwork (for static cached site)
              const albumWithColors: AlbumWithColors = {
                title: album.title,
                artist: album.artist,
              };
              
              // Extract album cover art colors
              if (album.coverArt) {
                console.log(`🎨 Extracting colors from album cover: ${album.title}`);
                try {
                  const colors = await extractColorsFromImageServer(album.coverArt);
                  if (colors) {
                    albumWithColors.colors = colors;
                  }
                } catch (colorError) {
                  console.warn(`⚠️ Failed to extract colors for ${album.title}:`, colorError);
                }
              }
              
              // Extract colors from track images
              if (album.tracks && album.tracks.length > 0) {
                const trackColors: Array<{ title: string; image?: string; colors: ExtractedColors }> = [];
                
                for (const track of album.tracks.slice(0, 10)) { // Limit to first 10 tracks for performance
                  if (track.image && track.image !== album.coverArt) {
                    try {
                      const trackColor = await extractColorsFromImageServer(track.image);
                      if (trackColor) {
                        trackColors.push({
                          title: track.title,
                          image: track.image,
                          colors: trackColor,
                        });
                      }
                    } catch (colorError) {
                      // Silently skip track color extraction failures
                    }
                  }
                }
                
                if (trackColors.length > 0) {
                  albumWithColors.tracks = trackColors;
                }
              }
              
              albumsWithColors.push(albumWithColors);
              console.log(`✅ Successfully parsed album: ${album.title}`);
            }
          } catch (error) {
            console.error(`❌ Failed to parse RSS feed ${feed.originalUrl}:`, error);
            if (includeErrors) {
              errors.push({
                feedId: feed.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }
      }
      
      // Save all extracted colors to albums-with-colors.json
      // Skip in serverless environments (read-only file system)
      if (albumsWithColors.length > 0 && typeof process !== 'undefined' && !process.env.VERCEL) {
        try {
          console.log(`💾 Saving colors for ${albumsWithColors.length} albums...`);
          batchUpdateAlbumColors(albumsWithColors);
          console.log(`✅ Saved colors to albums-with-colors.json`);
        } catch (colorSaveError) {
          console.warn('⚠️ Failed to save colors:', colorSaveError);
        }
      } else if (albumsWithColors.length > 0) {
        console.log('☁️ Serverless environment - skipping color file writes');
      }

      const result: AlbumsResult = {
        albums,
        count: albums.length,
        timestamp: new Date().toISOString(),
        source: 'database-feeds',
      };

      if (includeErrors && errors.length > 0) {
        result.errors = errors;
      }

      // Cache the result
      this.memoryCache = result;
      this.cacheTimestamp = Date.now();

      return result;
    } catch (error) {
      console.error('Error fetching from database:', error);
      // Fallback to static data
      return await this.fetchFromStaticFile();
    }
  }

  /**
   * Auto-fetch: try static first, fallback to dynamic
   */
  private static async fetchAuto(
    forceRegenerate: boolean,
    priority?: 'core' | 'extended' | 'low',
    includeErrors = true
  ): Promise<AlbumsResult> {
    // Try static file first (unless forced regeneration)
    if (!forceRegenerate) {
      const staticResult = await this.fetchFromStaticFile();
      if (staticResult.albums.length > 0) {
        console.log('📦 Using pre-generated static album data');
        return staticResult;
      }
    }

    // Fallback to dynamic parsing
    try {
      const dynamicResult = await this.fetchFromFeedManager(priority, includeErrors);
      
      // Even if there are errors, return partial results if we have some albums
      if (dynamicResult.albums.length > 0) {
        return dynamicResult;
      }
      
      // If no albums but we have a static file, try that
      const staticResult = await this.fetchFromStaticFile();
      if (staticResult.albums.length > 0) {
        console.log('📦 Falling back to static file (dynamic parsing returned no albums)');
        return {
          ...staticResult,
          fallback: true,
          errors: dynamicResult.errors // Include errors from dynamic parsing attempt
        };
      }
      
      // Return empty result with errors
      return dynamicResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('❌ Dynamic fetch failed:', errorMessage);
      if (errorStack) {
        console.error('Stack trace:', errorStack);
      }
      console.log('🔄 Trying static fallback...');
      const staticResult = await this.fetchFromStaticFile();
      if (staticResult.albums.length > 0) {
        return {
          ...staticResult,
          fallback: true,
          errors: includeErrors ? [{ feedId: 'system', error: `Dynamic parsing failed: ${errorMessage}` }] : undefined
        };
      }
      // If static also fails, return error result (but don't throw - return empty array)
      return {
        albums: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'auto',
        errors: includeErrors ? [{ feedId: 'system', error: `Dynamic parsing failed: ${errorMessage}` }] : undefined,
      };
    }
  }

  /**
   * Clear the in-memory cache
   */
  static clearCache(): void {
    this.memoryCache = null;
    this.cacheTimestamp = 0;
  }
}

