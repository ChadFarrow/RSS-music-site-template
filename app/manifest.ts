import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Music Site';
  const shortName = siteName.length > 12 ? siteName.substring(0, 12) : siteName;
  
  return {
    name: `${siteName} - Music Platform`,
    short_name: shortName,
    description: 'Value4Value music platform powered by Lightning Network',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    categories: ['music', 'entertainment', 'lifestyle'],
    prefer_related_applications: false,
    icons: [
      // Try WebP first, then PNG for each size
      {
        src: '/icon-192x192.webp',
        sizes: '192x192',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-76x76.webp',
        sizes: '76x76',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/icon-76x76.png',
        sizes: '76x76',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/placeholder-podcast.webp',
        sizes: '1280x720',
        type: 'image/webp',
        form_factor: 'wide',
        label: 'Music Platform Screenshot',
      },
      {
        src: '/placeholder-podcast.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Music Platform Screenshot',
      },
    ],
    shortcuts: [
      {
        name: 'Browse Albums',
        short_name: 'Albums',
        description: 'Browse all available albums',
        url: '/',
        icons: [
          {
            src: '/icon-76x76.webp',
            sizes: '76x76',
            type: 'image/webp',
          },
          {
            src: '/icon-76x76.png',
            sizes: '76x76',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}

