import { Album, Track } from '@/lib/types/album';
import { BoostMetadata } from '@/lib/types/boost';
import { getSiteName, getSiteUrl } from '@/lib/site-config';
import { generateSlug } from './url-utils';

/**
 * Create boost metadata from album and/or track data
 * Generates consistent boost metadata with all required fields
 */
export function createBoostMetadata(options: {
  album?: Album | string;
  track?: Track | { title?: string; artist?: string; guid?: string; podcastGuid?: string; feedGuid?: string; feedUrl?: string; publisherGuid?: string; publisherUrl?: string; imageUrl?: string; image?: string };
  senderName?: string;
  message?: string;
  url?: string;
  timestamp?: number;
  episode?: string;
}): BoostMetadata {
  const { album, track, senderName, message, url, timestamp, episode } = options;
  
  // Handle album as string (album title) or Album object
  const albumObj = typeof album === 'string' ? null : album;
  const albumTitle = typeof album === 'string' ? album : albumObj?.title || 'Unknown Album';
  const albumArtist = albumObj?.artist || 'Unknown Artist';
  
  // Use provided track or fall back to first track in album
  const selectedTrack = track || albumObj?.tracks?.[0];
  
  // Generate URL if not provided
  let boostUrl = url;
  if (!boostUrl && albumObj) {
    const albumSlug = generateSlug(albumObj.title).trim();
    boostUrl = `${getSiteUrl()}/album/${encodeURIComponent(albumSlug)}`;
  } else if (!boostUrl) {
    boostUrl = getSiteUrl() || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }
  
  // Handle track title/artist
  const trackTitle = selectedTrack?.title || albumTitle;
  // Track interface doesn't have artist property, get from album
  const trackArtist = albumArtist;
  
  return {
    title: trackTitle,
    artist: trackArtist,
    album: albumTitle,
    episode: episode || trackTitle,
    url: boostUrl,
    appName: getSiteName(),
    senderName: senderName?.trim() || 'Super Fan',
    message: message?.trim() || undefined,
    timestamp: timestamp,
    itemGuid: selectedTrack?.guid,
    podcastGuid: selectedTrack?.podcastGuid,
    podcastFeedGuid: (selectedTrack as Track)?.feedGuid || albumObj?.feedGuid,
    feedUrl: (selectedTrack as Track)?.feedUrl || albumObj?.feedUrl,
    publisherGuid: (selectedTrack as Track)?.publisherGuid || albumObj?.publisherGuid,
    publisherUrl: (selectedTrack as Track)?.publisherUrl || albumObj?.publisherUrl,
    imageUrl: (selectedTrack as Track)?.imageUrl || (selectedTrack as any)?.image || albumObj?.imageUrl || albumObj?.coverArt,
  };
}

