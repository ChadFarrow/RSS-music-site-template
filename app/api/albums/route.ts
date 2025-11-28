import { NextRequest } from 'next/server';
import { AlbumsService, AlbumsDataSource } from '@/lib/albums-service';
import { createAlbumsResponse, createErrorResponse, CachePresets } from '@/lib/api-response-utils';

export const dynamic = 'force-dynamic';

// Initialize auto feed processor on module load (server-side only)
// This will gracefully skip in serverless environments
if (typeof window === 'undefined') {
  try {
    // Use dynamic import to prevent module load errors from crashing the route
    import('@/lib/auto-feed-processor').then(({ startAutoFeedProcessor }) => {
      startAutoFeedProcessor();
    }).catch((error) => {
      // Don't crash if auto-processor fails to start
      console.warn('Auto feed processor initialization failed (non-critical):', error);
    });
  } catch (error) {
    // Don't crash if import fails
    console.warn('Auto feed processor import failed (non-critical):', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get('source');
    const source = (sourceParam as AlbumsDataSource) || 'auto';
    const forceRegenerate = searchParams.get('regenerate') === 'true';
    const clearCache = searchParams.get('clear') === 'true';
    const includeErrors = searchParams.get('errors') !== 'false'; // Default to true

    let result;
    try {
      result = await AlbumsService.fetchAlbums({
        source,
        forceRegenerate,
        clearCache,
        includeErrors,
      });
    } catch (serviceError) {
      // If AlbumsService throws, return empty result instead of 500
      console.error('AlbumsService.fetchAlbums threw an error:', serviceError);
      const errorMessage = serviceError instanceof Error ? serviceError.message : String(serviceError);
      const response = createAlbumsResponse([], {
        source: 'error-fallback',
        errors: [{
          feedId: 'system',
          error: `AlbumsService error: ${errorMessage}`
        }],
        cacheControl: 'no-store, no-cache, must-revalidate, max-age=0', // Don't cache error responses
      });
      // Add additional headers to prevent caching
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    // Use appropriate cache control based on source type
    const cacheControl = result.static 
      ? CachePresets.STATIC 
      : result.cached 
        ? CachePresets.MEDIUM 
        : CachePresets.SHORT;

    // Return response even if there are errors (partial results are better than 500)
    try {
      return createAlbumsResponse(result.albums || [], {
        cached: result.cached,
        cacheAge: result.cacheAge,
        cacheControl,
        source: result.source,
        static: result.static,
        fallback: result.fallback,
        errors: result.errors,
        headers: result.static ? {
          'CDN-Cache-Control': 'max-age=7200',
        } : undefined,
      });
    } catch (responseError) {
      // If response creation fails, return a basic JSON response
      console.error('Error creating response:', responseError);
      return new Response(JSON.stringify({
        albums: result.albums || [],
        count: (result.albums || []).length,
        source: result.source || 'error-fallback',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': CachePresets.SHORT,
        },
      });
    }
  } catch (error) {
    // Log error but return empty result instead of 500 error
    // This allows the site to load even if RSS parsing fails
    console.error('Error fetching albums:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    
    // Return empty albums array with error info instead of 500
    try {
      const response = createAlbumsResponse([], {
        source: 'error-fallback',
        errors: [{
          feedId: 'system',
          error: `Failed to fetch albums: ${errorMessage}`
        }],
        cacheControl: 'no-store, no-cache, must-revalidate, max-age=0', // Don't cache error responses
      });
      // Add additional headers to prevent caching
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    } catch (fallbackError) {
      // Last resort: return basic JSON response
      console.error('Error creating fallback response:', fallbackError);
      return new Response(JSON.stringify({
        albums: [],
        count: 0,
        source: 'error-fallback',
        errors: [{
          feedId: 'system',
          error: `Failed to fetch albums: ${errorMessage}`
        }],
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
  }
}