'use client';

export default function AlbumSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Skeleton */}
      <header className="bg-black/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 h-4 bg-gray-700 rounded animate-pulse"></div>
                <div className="w-2 h-4 bg-gray-700 rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-20 h-4 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Album Hero Section Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Album Artwork Skeleton */}
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              <div className="w-64 h-64 lg:w-80 lg:h-80 bg-gray-700 rounded-xl animate-pulse"></div>
            </div>

            {/* Album Info Skeleton */}
            <div className="flex-1 text-center lg:text-left">
              <div className="mb-4">
                <div className="h-12 lg:h-16 bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-6 lg:h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-700 rounded animate-pulse mb-4"></div>
                
                <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
                  <div className="h-4 bg-gray-700 rounded animate-pulse w-16"></div>
                  <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
                </div>

                <div className="max-w-2xl mx-auto lg:mx-0 mb-6 bg-gray-800/30 rounded-xl p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
                  </div>
                </div>
              </div>

              {/* Play Controls Skeleton */}
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
                <div className="h-12 bg-gray-700 rounded-full animate-pulse w-32"></div>
                <div className="h-12 bg-gray-700 rounded-full animate-pulse w-12"></div>
                <div className="h-12 bg-gray-700 rounded-full animate-pulse w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List Skeleton */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="h-8 bg-gray-700 rounded animate-pulse w-24"></div>
            </div>
            
            <div className="divide-y divide-white/5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4">
                  <div className="w-8 h-4 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-12 h-12 bg-gray-700 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-700 rounded animate-pulse w-12"></div>
                  <div className="h-8 bg-gray-700 rounded-lg animate-pulse w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-24" />
    </div>
  );
}