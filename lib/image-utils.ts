/**
 * Image URL utilities for cleaning and sanitizing image URLs
 */

/**
 * Cleans image URLs to prevent 400 errors by removing problematic query string patterns
 * Fixes common issues like "?.jpg", "?.", and trailing "?"
 * 
 * @param imageUrl - The image URL to clean
 * @returns The cleaned image URL, or undefined if input is falsy
 */
export function cleanImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  return imageUrl
    .replace(/\?\.jpg$/, '.jpg')
    .replace(/\?\.$/, '')
    .replace(/\?$/, '');
}

/**
 * Cleans image URLs in an album object (cover art and track images)
 * 
 * @param album - Album object with coverArt and tracks with image properties
 */
export function cleanAlbumImages(album: {
  coverArt?: string | null;
  tracks?: Array<{ image?: string | null }>;
}): void {
  if (album.coverArt) {
    album.coverArt = cleanImageUrl(album.coverArt) || album.coverArt;
  }

  if (album.tracks) {
    album.tracks.forEach(track => {
      if (track.image) {
        track.image = cleanImageUrl(track.image) || track.image;
      }
    });
  }
}

