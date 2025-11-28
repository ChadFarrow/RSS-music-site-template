import { Metadata } from 'next';
import PublisherDetailClient from './PublisherDetailClient';
import { getSiteName } from '@/lib/site-config';

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const publisherName = decodeURIComponent(name).replace(/-/g, ' ');
  
  const siteName = getSiteName();
  return {
    title: `${publisherName} | ${siteName}`,
    description: `View all albums from ${publisherName}`,
  };
}

async function getPublisherData(publisherName: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                     : `http://localhost:${process.env.PORT || '3000'}`);
    
    // Use the publisher API endpoint which handles parsed feeds
    const encodedName = encodeURIComponent(publisherName);
    const response = await fetch(`${baseUrl}/api/publisher/${encodedName}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error('Failed to fetch publisher:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Return both publisher and publisherItems if available
    return {
      publisher: data.publisher || null,
      publisherItems: data.publisherItems || null,
      source: data.source || 'unknown'
    };
  } catch (error) {
    console.error('Error fetching publisher data:', error);
    return null;
  }
}

export default async function PublisherPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const publisherData = await getPublisherData(decodedName);
  // Use the decoded name (which may have hyphens) for display
  const publisherName = decodedName.replace(/-/g, ' ');

  return <PublisherDetailClient 
    publisherName={publisherName}
    publisherSlug={decodedName}
    initialPublisher={publisherData?.publisher || null}
    initialPublisherItems={publisherData?.publisherItems || null}
  />;
}