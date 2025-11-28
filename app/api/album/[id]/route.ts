import { NextResponse } from 'next/server';
import { FeedManager } from '@/lib/feed-manager';
import { RSSParser } from '@/lib/rss-parser';
import { generateAlbumSlug, generateSlug } from '@/lib/url-utils';

// Cache for individual albums to avoid repeated RSS parsing
let albumCache: Map<string, { data: any; timestamp: number }> = new Map();
const ALBUM_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const albumId = decodeURIComponent(id);
    
    console.log(`🔍 Looking for single album with ID: "${albumId}"`);
    
    // Check cache first
    const cached = albumCache.get(albumId);
    if (cached && Date.now() - cached.timestamp < ALBUM_CACHE_TTL) {
      console.log(`📦 Serving cached album: "${albumId}"`);
      const response = NextResponse.json({ 
        album: cached.data,
        cached: true,
        timestamp: new Date().toISOString()
      });
      
      // Add cache headers for better performance
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
      return response;
    }
    
    // Get feeds directly from FeedManager (uses feeds.json, no database)
    const feeds = FeedManager.getActiveFeeds();
    
    // Check if this ID matches a publisher feed first
    const publisherFeeds = feeds.filter(feed => feed.type === 'publisher');
    const matchingPublisherFeed = publisherFeeds.find(feed => {
      // Check direct ID match
      if (feed.id === albumId) return true;
      
      // Check if ID matches publisher feed title slug
      const feedTitleSlug = generateSlug(feed.title);
      return feedTitleSlug === albumId.toLowerCase();
    });
    
    if (matchingPublisherFeed) {
      console.log(`⚠️ ID "${albumId}" matches a publisher feed, not an album. Use /publisher/[name] instead.`);
      return NextResponse.json({ 
        error: 'This is a publisher feed, not an album',
        message: `Publisher feeds contain lists of RSS feeds and should be accessed via /publisher/[name]`,
        publisherFeedId: matchingPublisherFeed.id,
        publisherTitle: matchingPublisherFeed.title,
        redirectTo: `/publisher/${encodeURIComponent(matchingPublisherFeed.title.toLowerCase().replace(/\s+/g, '-'))}`
      }, { status: 400 });
    }
    
    const albumFeeds = feeds.filter(feed => feed.type === 'album');
    
    // Find the matching album feed first
    let matchingFeed = null;
    
    // First try direct feed ID match (fastest)
    for (const feed of albumFeeds) {
      if (feed.id === albumId) {
        matchingFeed = feed;
        console.log(`✅ Found direct feedId match: "${feed.id}"`);
        break;
      }
    }
    
    // If no direct match, try parsing RSS feeds to match by album title
    if (!matchingFeed) {
      console.log(`🔍 No direct feedId match, searching by album title...`);
      
      for (const feed of albumFeeds) {
        try {
          console.log(`🎵 Testing feed: ${feed.title}`);
          
          // Parse this feed to get the actual album data
          const albumData = await RSSParser.parseAlbumFeed(feed.originalUrl);
          if (!albumData?.title) continue;
          
          // Try various matching patterns with the actual album title
          const albumTitle = albumData.title;
          const titleMatch = albumTitle.toLowerCase() === albumId.toLowerCase();
          const slugMatch = generateAlbumSlug(albumTitle) === albumId.toLowerCase();
          const compatMatch = generateSlug(albumTitle) === albumId.toLowerCase();
          
          // Flexible matching: check if the album title starts with the decoded ID
          const baseTitle = albumTitle.toLowerCase().split(/\s*[-–]\s*/)[0];
          const baseTitleSlug = generateAlbumSlug(baseTitle);
          const flexibleMatch = baseTitleSlug === albumId.toLowerCase();
          
          if (titleMatch || slugMatch || compatMatch || flexibleMatch) {
            matchingFeed = feed;
            // Store the already parsed album data to avoid re-parsing
            (matchingFeed as any)._parsedAlbumData = albumData;
            console.log(`✅ Found title match: "${albumTitle}" -> "${feed.id}"`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Failed to parse feed ${feed.id} for title matching:`, error);
          continue; // Try next feed
        }
      }
    }
    
    // If no feed found, check static albums data as fallback
    if (!matchingFeed) {
      console.log(`🔍 No feed match, checking static albums data...`);
      
      try {
        let staticAlbums: any[] = [];
        
        // In serverless environments (Vercel), use HTTP fetch instead of filesystem
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
        
        if (isServerless) {
          try {
            // Try to fetch via HTTP (public files are served as static assets)
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            try {
              const response = await fetch(`${baseUrl}/static-albums.json`, {
                cache: 'no-store',
                signal: controller.signal,
                headers: {
                  'User-Agent': 'AlbumAPI/1.0'
                }
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const staticAlbumsJson = await response.json();
                staticAlbums = staticAlbumsJson.albums || [];
                console.log(`📊 Static albums loaded via HTTP: ${staticAlbums.length} albums found`);
              } else {
                console.warn(`⚠️ Static file HTTP fetch returned ${response.status}: ${response.statusText}`);
              }
            } catch (fetchError) {
              clearTimeout(timeoutId);
              if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.warn('⚠️ Static file HTTP fetch timed out');
              } else {
                console.warn('⚠️ Failed to fetch static file via HTTP:', fetchError instanceof Error ? fetchError.message : fetchError);
              }
            }
          } catch (error) {
            console.warn('⚠️ Error in HTTP fetch attempt:', error instanceof Error ? error.message : error);
          }
        } else {
          // In non-serverless environments, try filesystem read
          try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const staticAlbumsPath = path.join(process.cwd(), 'public', 'static-albums.json');
            const staticAlbumsData = await fs.readFile(staticAlbumsPath, 'utf8');
            const staticAlbumsJson = JSON.parse(staticAlbumsData);
            staticAlbums = staticAlbumsJson.albums || [];
            console.log(`📊 Static albums loaded from filesystem: ${staticAlbums.length} albums found`);
          } catch (fsError) {
            console.warn('⚠️ Failed to read static file from filesystem:', fsError instanceof Error ? fsError.message : fsError);
          }
        }
        
        if (staticAlbums.length > 0) {
          // Search static albums for matching ID
          const matchingStaticAlbum = staticAlbums.find((album: any) => {
            const titleMatch = album.title?.toLowerCase() === albumId.toLowerCase();
            const slugMatch = generateAlbumSlug(album.title || '') === albumId.toLowerCase();
            const compatMatch = generateSlug(album.title || '') === albumId.toLowerCase();
            
            // Flexible matching: check if the album title starts with the decoded ID
            const baseTitle = album.title?.toLowerCase().split(/\s*[-–]\s*/)[0] || '';
            const baseTitleSlug = generateAlbumSlug(baseTitle);
            const flexibleMatch = baseTitleSlug === albumId.toLowerCase();
            
            return titleMatch || slugMatch || compatMatch || flexibleMatch;
          });
          
          if (matchingStaticAlbum) {
            console.log(`✅ Found static album match: "${matchingStaticAlbum.title}"`);
            
            // Return static album data directly (it's already in the correct format)
            const album = {
              ...matchingStaticAlbum,
              feedId: 'static-' + albumId,
              feedUrl: 'static-data',
              lastUpdated: new Date().toISOString()
            };
            
            const parseTime = 0; // Static data doesn't need parse time
            console.log(`✅ Successfully returned static album in ${parseTime}ms: "${album?.title || 'Unknown'}"`);
            
            return NextResponse.json({ 
              album,
              parseTime: `${parseTime}ms`,
              timestamp: new Date().toISOString(),
              source: 'static-data'
            });
          }
        }
      } catch (error) {
        console.log(`⚠️ Failed to check static albums data:`, error);
      }
      
      console.log(`❌ No matching album found for: "${albumId}"`);
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }
    
    console.log(`✅ Found matching feed: "${matchingFeed.title || matchingFeed.id}"`);
    
    // Parse only the single RSS feed we need (or reuse already parsed data)
    console.log(`🎵 Parsing single RSS feed: ${matchingFeed.originalUrl}`);
    const startTime = Date.now();
    
    let albumData;
    
    // If we already parsed this feed during title matching, reuse the data
    if ((matchingFeed as any)._parsedAlbumData) {
      console.log(`♻️ Reusing already parsed album data`);
      albumData = (matchingFeed as any)._parsedAlbumData;
    } else {
      albumData = await RSSParser.parseAlbumFeed(matchingFeed.originalUrl);
    }
    
    if (!albumData) {
      return NextResponse.json({ error: 'Failed to parse album' }, { status: 500 });
    }
    
    // Add feed metadata
    const album = {
      ...albumData,
      feedId: matchingFeed.id,
      feedUrl: matchingFeed.originalUrl,
      lastUpdated: matchingFeed.lastUpdated
    };
    
    const parseTime = Date.now() - startTime;
    console.log(`✅ Successfully parsed album in ${parseTime}ms: "${album?.title || 'Unknown'}"`);
    
    // Cache the result
    albumCache.set(albumId, { data: album, timestamp: Date.now() });
    
    const response = NextResponse.json({ 
      album,
      parseTime: `${parseTime}ms`,
      timestamp: new Date().toISOString(),
      cached: false
    });
    
    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return response;
    
  } catch (error) {
    console.error('❌ Error fetching single album:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    
    // Return 404 instead of 500 to prevent flashing - better UX
    // The page will show "Album not found" instead of crashing
    return NextResponse.json({ 
      error: 'Album not found',
      details: errorMessage
    }, { status: 404 });
  }
}