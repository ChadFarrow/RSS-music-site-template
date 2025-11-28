import { Album, Track, PaymentRecipient } from '@/lib/types/album';

/**
 * Extract payment recipients from album and/or track data
 * Checks in priority order:
 * 1. album.paymentRecipients (pre-processed)
 * 2. album.value.recipients (from RSS podcast:value)
 * 3. track.paymentRecipients (pre-processed)
 * 4. track.value.recipients (from RSS podcast:value)
 * 
 * Filters for node or lnaddress recipient types and maps to consistent format
 */
export function extractPaymentRecipients(
  album: Album,
  track?: Track
): PaymentRecipient[] | null {
  if (!album) return null;

  // 1. Check for pre-processed album payment recipients
  if (album.paymentRecipients && album.paymentRecipients.length > 0) {
    return album.paymentRecipients;
  }

  // 2. Check for album-level value.recipients (from RSS podcast:value)
  if (
    album.value &&
    album.value.type === 'lightning' &&
    (album.value.method === 'keysend' || album.value.method === 'lnaddress') &&
    album.value.recipients &&
    album.value.recipients.length > 0
  ) {
    return album.value.recipients
      .filter((r) => r.type === 'node' || r.type === 'lnaddress')
      .map((r) => ({
        address: r.address,
        split: r.split,
        name: r.name,
        fee: r.fee,
        type: r.type,
      }));
  }

  // 3. Check for pre-processed track payment recipients
  if (track?.paymentRecipients && track.paymentRecipients.length > 0) {
    return track.paymentRecipients;
  }

  // 4. Check for track-level value.recipients (from RSS podcast:value)
  if (
    track?.value &&
    track.value.type === 'lightning' &&
    (track.value.method === 'keysend' || track.value.method === 'lnaddress') &&
    track.value.recipients &&
    track.value.recipients.length > 0
  ) {
    return track.value.recipients
      .filter((r) => r.type === 'node' || r.type === 'lnaddress')
      .map((r) => ({
        address: r.address,
        split: r.split,
        name: r.name,
        fee: r.fee,
        type: r.type,
      }));
  }

  return null;
}

/**
 * Extract payment recipients for a specific track
 * Gets track-specific recipients, falls back to album if track has none
 */
export function extractTrackPaymentRecipients(
  track: Track,
  fallbackAlbum?: Album
): PaymentRecipient[] | null {
  if (!track) return null;

  // 1. Check for pre-processed track payment recipients
  if (track.paymentRecipients && track.paymentRecipients.length > 0) {
    return track.paymentRecipients;
  }

  // 2. Check for track-level value.recipients (from RSS podcast:value)
  if (
    track.value &&
    track.value.type === 'lightning' &&
    (track.value.method === 'keysend' || track.value.method === 'lnaddress') &&
    track.value.recipients &&
    track.value.recipients.length > 0
  ) {
    return track.value.recipients
      .filter((r) => r.type === 'node' || r.type === 'lnaddress')
      .map((r) => ({
        address: r.address,
        split: r.split,
        name: r.name,
        fee: r.fee,
        type: r.type,
      }));
  }

  // 3. Fallback to album-level payment recipients if track doesn't have its own
  if (fallbackAlbum) {
    return extractPaymentRecipients(fallbackAlbum);
  }

  return null;
}

