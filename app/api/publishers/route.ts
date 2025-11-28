import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Album, Publisher } from '@/lib/types/album';
import dataService from '@/lib/data-service';
import { AlbumsService } from '@/lib/albums-service';
import { generateSlug } from '@/lib/url-utils';

// Publisher feeds are now included in the Artists listing

// Helper function to create slug for matching
const createSlug = generateSlug;

export async function GET(request: NextRequest) {
  try {
    // Get albums using AlbumsService (works on server-side)
    let albums: Album[] = [];
    
    try {
      // Try AlbumsService first
      if (typeof AlbumsService !== 'undefined' && AlbumsService.fetchAlbums) {
        const result = await AlbumsService.fetchAlbums({
          source: 'auto',
          includeErrors: false
        });
        
        // Ensure result is valid and has albums array
        if (result && Array.isArray(result.albums)) {
          albums = result.albums;
          console.log(`📦 Loaded ${albums.length} albums from AlbumsService`);
        } else {
          console.warn('⚠️ AlbumsService returned invalid result format');
          albums = [];
        }
      } else {
        console.warn('⚠️ AlbumsService not available');
        albums = [];
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error fetching albums from AlbumsService:', errorMsg);
      if (error instanceof Error && error.stack) {
        console.error('Stack:', error.stack);
      }
      // Return empty array - better than crashing
      albums = [];
    }

    // Step 1: Group albums by publisher (with fallback to artist name)
    // This creates "fake" publishers from artist names
    const publishersMap = new Map<string, Publisher>();

    albums.forEach((album) => {
      // Skip albums without artist name
      if (!album.artist || !album.artist.trim()) {
        console.warn('⚠️ Skipping album without artist:', album.title);
        return;
      }

      // Use publisher GUID if available, otherwise fall back to artist name
      let publisherKey: string;
      let publisherInfo: {
        guid: string;
        feedUrl: string;
        medium: string;
      };

      if (album.publisher && album.publisher.feedGuid) {
        // Use publisher info from RSS feed (Podcasting 2.0)
        publisherKey = album.publisher.feedGuid;
        publisherInfo = {
          guid: album.publisher.feedGuid,
          feedUrl: album.publisher.feedUrl || '',
          medium: album.publisher.medium || 'music'
        };
      } else {
        // Fallback: group by artist name (normalized to lowercase for consistency)
        const artistName = album.artist.trim();
        publisherKey = artistName.toLowerCase();
        publisherInfo = {
          guid: `artist-${publisherKey.replace(/[^a-z0-9]/g, '-')}`,
          feedUrl: '',
          medium: 'music'
        };
      }
      
      if (!publishersMap.has(publisherKey)) {
        const newPublisher: Publisher = {
          name: album.artist,
          guid: publisherInfo.guid,
          feedUrl: publisherInfo.feedUrl,
          medium: publisherInfo.medium,
          albums: [],
          albumCount: 0,
          firstAlbumCover: album.coverArt || ''
        };
        publishersMap.set(publisherKey, newPublisher);
      }

      const publisher = publishersMap.get(publisherKey);
      if (publisher) {
        publisher.albums.push(album);
        publisher.albumCount = (publisher.albumCount || 0) + 1;
      }
    });

    // Step 2: Get real publisher feeds and merge with fake publishers
    let publisherFeeds: any[] = [];
    try {
      const feeds = await dataService.getFeeds();
      publisherFeeds = feeds.filter((feed: any) => 
        feed.type === 'publisher' && feed.parseStatus === 'success'
      );
    } catch (error) {
      console.warn('⚠️ Could not fetch publisher feeds from DataService:', error);
      // Continue without publisher feeds - we'll still have artist-grouped publishers
      publisherFeeds = [];
    }

    console.log(`📚 Found ${publisherFeeds.length} publisher feed(s) to merge`);

    for (const publisherFeed of publisherFeeds) {
      const publisherInfo = publisherFeed.parsedData?.publisherInfo || {};
      const publisherName = publisherInfo.artist || publisherInfo.title || publisherFeed.title || '';
      const publisherGuid = publisherInfo.feedGuid || publisherFeed.id;
      const publisherFeedUrl = publisherInfo.feedUrl || publisherFeed.originalUrl;
      const publisherCoverArt = publisherInfo.coverArt || '';

      console.log(`🔍 Processing publisher feed: ${publisherFeed.id}, name: "${publisherName}", guid: ${publisherGuid}`);

      if (!publisherName) {
        console.warn(`⚠️ Skipping publisher feed ${publisherFeed.id} - no name found`);
        continue;
      }

      // Try to find a matching fake publisher by name or artist
      const publisherNameLower = publisherName.toLowerCase().trim();
      const publisherNameSlug = createSlug(publisherName);
      
      let matchingFakePublisher: Publisher | null = null;
      let matchingKey: string | null = null;

      // Check for matches by name/artist - be more flexible with matching
      const publishersEntries = Array.from(publishersMap.entries());
      console.log(`🔍 Checking ${publishersEntries.length} fake publishers for match with "${publisherName}"`);
      
      for (const [key, publisher] of publishersEntries) {
        const publisherNameLower2 = publisher.name.toLowerCase().trim();
        const publisherSlug = createSlug(publisher.name);
        
        // Try multiple matching strategies
        const exactMatch = publisherNameLower2 === publisherNameLower;
        const slugMatch = publisherSlug === publisherNameSlug;
        const containsMatch = publisherNameLower2.includes(publisherNameLower) || publisherNameLower.includes(publisherNameLower2);
        
        // Also check if artist names are similar (for "The Doerfels" vs "Doerfels")
        const normalized1 = publisherNameLower.replace(/^the\s+/, '');
        const normalized2 = publisherNameLower2.replace(/^the\s+/, '');
        const normalizedMatch = normalized1 === normalized2;
        
        console.log(`  Comparing "${publisher.name}" (${key}): exact=${exactMatch}, slug=${slugMatch}, contains=${containsMatch}, normalized=${normalizedMatch}`);
        
        if (exactMatch || slugMatch || (containsMatch && Math.abs(publisherNameLower.length - publisherNameLower2.length) < 5) || normalizedMatch) {
          matchingFakePublisher = publisher;
          matchingKey = key;
          console.log(`✅ Found match: "${publisher.name}" matches "${publisherName}" (key: ${key})`);
          break;
        }
      }
      
      if (!matchingFakePublisher) {
        console.log(`❌ No match found for "${publisherName}" - will add as new publisher`);
      }

      if (matchingFakePublisher && matchingKey) {
        // Merge: Use real publisher feed info, and combine albums from both sources
        console.log(`🔄 Merging fake publisher "${matchingFakePublisher.name}" into real publisher feed "${publisherName}"`);
        
        // Get albums from the real publisher feed too
        let publisherAlbums: Album[] = [];
        try {
          const publisherData = await dataService.getPublisherData(publisherGuid);
          if (publisherData && publisherData.albums) {
            publisherAlbums = publisherData.albums.map((rssAlbum: any) => ({
              title: rssAlbum.title,
              artist: rssAlbum.artist,
              description: rssAlbum.description,
              coverArt: rssAlbum.coverArt || '',
              tracks: rssAlbum.tracks || [],
              releaseDate: rssAlbum.releaseDate,
              feedId: rssAlbum.feedId || '',
              feedUrl: rssAlbum.feedUrl,
              funding: rssAlbum.funding,
              value: rssAlbum.value,
              paymentRecipients: rssAlbum.paymentRecipients,
              publisher: rssAlbum.publisher,
              feedGuid: rssAlbum.feedGuid,
              publisherGuid: rssAlbum.publisherGuid,
              publisherUrl: rssAlbum.publisherUrl,
              imageUrl: rssAlbum.imageUrl
            }));
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch albums for publisher ${publisherName}:`, error);
        }
        
        // Combine albums from both sources, avoiding duplicates by feedId
        const existingFeedIds = new Set(matchingFakePublisher.albums.map(a => a.feedId));
        const newAlbums = publisherAlbums.filter(a => a.feedId && !existingFeedIds.has(a.feedId));
        const combinedAlbums = [...matchingFakePublisher.albums, ...newAlbums];
        
        const mergedPublisher: Publisher = {
          name: publisherName,
          guid: publisherGuid,
          feedUrl: publisherFeedUrl,
          medium: 'publisher',
          albums: combinedAlbums,
          albumCount: combinedAlbums.length,
          firstAlbumCover: publisherCoverArt || matchingFakePublisher.firstAlbumCover || combinedAlbums[0]?.coverArt
        };

        // Remove fake publisher and add merged one
        publishersMap.delete(matchingKey);
        publishersMap.set(publisherGuid, mergedPublisher);
      } else {
        // No matching fake publisher - add real publisher feed as new entry
        // Even if it has no albums yet, it should appear in the list
        console.log(`➕ Adding publisher feed "${publisherName}" (no matching fake publisher found)`);
        
        // Try to get albums for this publisher from DataService
        let publisherAlbums: Album[] = [];
        try {
          const publisherData = await dataService.getPublisherData(publisherGuid);
          if (publisherData && publisherData.albums) {
            // Convert RSSAlbums to Albums
            publisherAlbums = publisherData.albums.map((rssAlbum: any) => ({
              title: rssAlbum.title,
              artist: rssAlbum.artist,
              description: rssAlbum.description,
              coverArt: rssAlbum.coverArt || '',
              tracks: rssAlbum.tracks || [],
              releaseDate: rssAlbum.releaseDate,
              feedId: rssAlbum.feedId || '',
              feedUrl: rssAlbum.feedUrl,
              funding: rssAlbum.funding,
              value: rssAlbum.value,
              paymentRecipients: rssAlbum.paymentRecipients,
              publisher: rssAlbum.publisher,
              feedGuid: rssAlbum.feedGuid,
              publisherGuid: rssAlbum.publisherGuid,
              publisherUrl: rssAlbum.publisherUrl,
              imageUrl: rssAlbum.imageUrl
            }));
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch albums for publisher ${publisherName}:`, error);
        }

        const newPublisher: Publisher = {
          name: publisherName,
          guid: publisherGuid,
          feedUrl: publisherFeedUrl,
          medium: 'publisher',
          albums: publisherAlbums,
          albumCount: publisherAlbums.length,
          firstAlbumCover: publisherCoverArt || publisherAlbums[0]?.coverArt
        };

        publishersMap.set(publisherGuid, newPublisher);
      }
    }

    // Convert to array and transform to match PublisherCard expectations
    const publishersArray = Array.from(publishersMap.values());
    
    // Transform publishers to match PublisherCard interface
    const transformedPublishers = publishersArray.map((publisher) => {
      // Find latest album by release date
      let latestAlbum: { title: string; coverArt: string; releaseDate: string } | undefined;
      
      if (publisher.albums && publisher.albums.length > 0) {
        // Sort albums by release date (newest first)
        const sortedAlbums = [...publisher.albums].sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
        
        const latest = sortedAlbums[0];
        if (latest) {
          latestAlbum = {
            title: latest.title,
            coverArt: latest.coverArt,
            releaseDate: latest.releaseDate || ''
          };
        }
      }
      
      // Transform to match PublisherCard interface
      return {
        name: publisher.name,
        feedGuid: publisher.guid, // Map guid to feedGuid
        feedUrl: publisher.feedUrl,
        medium: publisher.medium,
        albumCount: publisher.albumCount || publisher.albums.length,
        latestAlbum: latestAlbum,
        // Keep original data for backward compatibility
        albums: publisher.albums,
        firstAlbumCover: publisher.firstAlbumCover
      };
    });
    
    // Sort by album count
    const publishers = transformedPublishers.sort((a, b) => (b.albumCount || 0) - (a.albumCount || 0));

    console.log(`✅ Returning ${publishers.length} publishers (${publisherFeeds.length} from real feeds)`);

    return NextResponse.json({
      publishers,
      totalPublishers: publishers.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Error fetching publishers:', errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }
    // Return empty publishers array instead of 500 error
    // This allows the Artists filter to show empty state instead of crashing
    return NextResponse.json({
      publishers: [],
      totalPublishers: 0,
      lastUpdated: new Date().toISOString(),
      error: errorMessage
    }, { status: 200 }); // Return 200 with empty array so UI doesn't break
  }
}