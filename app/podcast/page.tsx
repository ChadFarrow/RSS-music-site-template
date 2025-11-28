'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PodcastPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main page
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg text-white">Redirecting to main page...</p>
      </div>
    </div>
  );
}

 