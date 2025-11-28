'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { getSiteName } from '@/lib/site-config';
import { PlaceholderAlbumArtImage } from '@/lib/image-helpers';
import { generateSlug } from '@/lib/url-utils';
import { DARK_HEADER_BG, DARK_HEADER_BORDER, DARK_CARD_CLASSES, DARK_BADGE_BG } from '@/lib/theme-utils';

import { Album, Track, Publisher } from '@/lib/types/album';

interface PublisherItem {
  feedGuid: string;
  feedUrl: string;
  medium: string;
  title?: string;
  feedImg?: string;
}

interface PublisherDetailClientProps {
  publisherName: string;
  publisherSlug?: string;
  initialPublisher: Publisher | null;
  initialPublisherItems?: PublisherItem[] | null;
}

export default function PublisherDetailClient({ publisherName, publisherSlug, initialPublisher, initialPublisherItems }: PublisherDetailClientProps) {
  const [publisher, setPublisher] = useState<Publisher | null>(initialPublisher);
  const [publisherItems, setPublisherItems] = useState<PublisherItem[] | null>(initialPublisherItems || null);
  const [publisherArtwork, setPublisherArtwork] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialPublisher);
  const [error, setError] = useState<string | null>(null);
  const { playAlbum } = useAudio();

  // Define loading functions before useEffect that uses them
  const loadPublisherArtwork = useCallback(async () => {
    try {
      const response = await fetch('/publishers.json');
      if (response.ok) {
        const publishers = await response.json();
        const decodedName = decodeURIComponent(publisherName);
        const currentPublisher = publishers.find((pub: any) => 
          pub.name.toLowerCase() === decodedName.toLowerCase() ||
          generateSlug(pub.name) === generateSlug(decodedName)
        );
        
        if (currentPublisher?.latestAlbum?.coverArt) {
          setPublisherArtwork(currentPublisher.latestAlbum.coverArt);
        }
      }
    } catch (error) {
    }
  }, [publisherName]);

  const loadPublisher = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use the publisher API endpoint - use slug if available, otherwise encode the name
      const nameToUse = publisherSlug || publisherName;
      const encodedName = encodeURIComponent(nameToUse);
      const response = await fetch(`/api/publisher/${encodedName}`);
      
      if (!response.ok) {
        throw new Error('Failed to load publisher');
      }

      const data = await response.json();
      
      if (data.publisher) {
        setPublisher(data.publisher);
        setPublisherItems(data.publisherItems || null);
        setError(null);
      } else {
        setError('Publisher not found');
      }
    } catch (err) {
      setError('Failed to load publisher');
    } finally {
      setIsLoading(false);
    }
  }, [publisherName, publisherSlug]);

  useEffect(() => {
    if (!initialPublisher) {
      loadPublisher();
    }
    loadPublisherArtwork();
  }, [publisherName, initialPublisher, loadPublisher, loadPublisherArtwork]);

  const getAlbumSlug = (album: Album) => {
    return generateSlug(album.title);
  };

  const getReleaseYear = (releaseDate: string) => {
    try {
      return new Date(releaseDate).getFullYear();
    } catch {
      return '';
    }
  };

  const handlePlayAlbum = (album: Album, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking play button
    e.stopPropagation();
    
    // Map album tracks to the expected format
    const tracks = album.tracks.map(track => ({
      ...track,
      artist: album.artist,
      album: album.title,
      image: track.image || album.coverArt
    }));
    
    playAlbum(tracks, 0, album.title);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !publisher) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-4">{error || 'Artist not found'}</h1>
        <Link 
          href="/"
          className="text-gray-300 hover:text-gray-200 transition-colors"
        >
          ← Back to albums
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {/* Use artist artwork as background */}
        {(publisherArtwork || publisher.albums[0]?.coverArt) && (
          <Image
            src={publisherArtwork || publisher.albums[0].coverArt}
            alt={`${publisher.name} background`}
            fill
            className="object-cover w-full h-full"
            priority
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/98 via-black/95 to-gray-900/98"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className={`${DARK_HEADER_BG} ${DARK_HEADER_BORDER} sticky top-0 z-50 shadow-lg`}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 hover:bg-black/50 rounded-lg transition-colors group"
                  title="Back to albums"
                >
                  <ArrowLeft className="w-5 h-5 text-white group-hover:scale-110 transition-transform drop-shadow-sm" />
                </Link>
                
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <Link href="/" className="text-gray-200 hover:text-white transition-colors drop-shadow-sm">
                    {getSiteName()}
                  </Link>
                  <span className="text-gray-400">/</span>
                  <span className="font-medium truncate max-w-[200px] text-white drop-shadow-sm">{publisher.name}</span>
                </div>
              </div>

              {/* Desktop Info */}
              <div className="hidden sm:block text-sm text-gray-200 drop-shadow-sm">
                {publisher.albums.length} albums
              </div>
            </div>
          </div>
        </header>

        {/* Artist Hero Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Artist Artwork */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-64 h-64 lg:w-80 lg:h-80 relative rounded-xl shadow-2xl overflow-hidden border border-white/20">
                  {publisherArtwork || publisher.albums[0]?.coverArt ? (
                    <Image
                      src={publisherArtwork || publisher.albums[0]?.coverArt || ''}
                      alt={publisher.name}
                      fill
                      className="object-cover"
                      priority
                      sizes="(min-width: 1024px) 320px, 256px"
                    />
                  ) : (
                    <PlaceholderAlbumArtImage
                      alt={publisher.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Artist Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-6">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-2 text-white drop-shadow-lg">
                    {publisher.name}
                  </h1>
                  <p className="text-xl lg:text-2xl text-gray-100 mb-4 drop-shadow-md">Artist</p>
                  
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-base text-gray-100 mb-6 drop-shadow-sm">
                    {publisher.albums.length > 0 && (
                      <span className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        {publisher.albums.length} albums
                      </span>
                    )}
                    {publisherItems && publisherItems.length > 0 && (
                      <span className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        {publisherItems.length} RSS feeds
                      </span>
                    )}
                    <span className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      {publisher.medium}
                    </span>
                  </div>

                  <div className="max-w-2xl mx-auto lg:mx-0 mb-6">
                    <p className="text-gray-100 leading-relaxed text-lg drop-shadow-sm">
                      All albums by {publisher.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Publisher Feeds (RemoteItems) */}
        {publisherItems && publisherItems.length > 0 && (
          <div className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">RSS Feeds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publisherItems.map((item, index) => (
                  <div
                    key={`${item.feedGuid}-${index}`}
                    className={`${DARK_CARD_CLASSES} p-4`}
                  >
                    {item.feedImg && (
                      <div className="aspect-square mb-3 rounded overflow-hidden relative">
                        <Image
                          src={item.feedImg}
                          alt={item.title || 'RSS Feed'}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-base mb-1 truncate text-white drop-shadow-sm">
                      {item.title || 'RSS Feed'}
                    </h3>
                    <p className="text-sm text-gray-200 mb-2 drop-shadow-sm">Medium: {item.medium}</p>
                    <a
                      href={item.feedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-300 hover:text-gray-200 transition-colors break-all drop-shadow-sm"
                    >
                      {item.feedUrl}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Albums Grid */}
        {publisher.albums && publisher.albums.length > 0 && (
          <div className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {publisher.albums.map((album, index) => (
                <div
                  key={`${album.feedId}-${index}`}
                  className="group relative"
                >
                  <Link
                    href={`/album/${getAlbumSlug(album)}`}
                    className="block"
                  >
                    <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 hover:bg-black/50 transition-colors border border-white/20 shadow-lg">
                      <div className="aspect-square mb-3 rounded overflow-hidden relative">
                        <Image
                          src={album.coverArt}
                          alt={album.title}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => handlePlayAlbum(album, e)}
                            className="p-3 bg-black/70 backdrop-blur-md border border-white/30 text-white rounded-full hover:scale-110 hover:bg-black/80 transition-transform shadow-lg"
                            title={`Play ${album.title}`}
                          >
                            <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-base mb-1 truncate text-white group-hover:text-gray-200 transition-colors drop-shadow-sm">
                        {album.title}
                      </h3>
                      <p className="text-sm text-gray-200 truncate drop-shadow-sm">{album.artist}</p>
                      {album.releaseDate && (
                        <p className="text-sm text-gray-300 mt-1 drop-shadow-sm">{getReleaseYear(album.releaseDate)}</p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacing for audio player */}
        <div className="h-24" />
      </div>
    </div>
  );
}