'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { generateSlug } from '@/lib/url-utils';
import { DARK_CARD_CLASSES, DARK_BADGE_BG, DARK_BADGE_TEXT } from '@/lib/theme-utils';

interface Publisher {
  name: string;
  feedGuid: string;
  feedUrl: string;
  medium: string;
  albumCount: number;
  latestAlbum?: {
    title: string;
    coverArt: string;
    releaseDate: string;
  };
}

interface PublisherCardProps {
  publisher: Publisher;
}

export default function PublisherCard({ publisher }: PublisherCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const publisherSlug = generateSlug(publisher.name);

  return (
    <Link
      href={`/publisher/${encodeURIComponent(publisherSlug)}`}
      className={`group ${DARK_CARD_CLASSES} p-4 block`}
    >
      <div className="flex items-center gap-4">
        {/* Publisher Avatar/Latest Album Cover */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
          {publisher.latestAlbum?.coverArt && !imageError ? (
            <Image
              src={publisher.latestAlbum.coverArt}
              alt={publisher.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>
        
        {/* Publisher Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-white group-hover:text-gray-200 transition-colors truncate drop-shadow-sm">
            {publisher.name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-200 mt-1 drop-shadow-sm">
            <span>{publisher.albumCount} release{publisher.albumCount !== 1 ? 's' : ''}</span>
            {publisher.medium === 'music' && (
              <span className={`px-2 py-1 ${DARK_BADGE_BG} rounded text-xs ${DARK_BADGE_TEXT}`}>
                Music
              </span>
            )}
          </div>
          {publisher.latestAlbum && (
            <p className="text-xs text-gray-300 mt-1 truncate drop-shadow-sm">
              Latest: {publisher.latestAlbum.title}
            </p>
          )}
        </div>

        {/* Arrow Icon */}
        <div className="flex-shrink-0 text-gray-200 group-hover:text-white group-hover:translate-x-1 transition-all drop-shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}