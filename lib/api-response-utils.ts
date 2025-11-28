import { NextResponse } from 'next/server';

/**
 * Cache control presets for different use cases
 */
export const CachePresets = {
  /** Short-lived cache (3-5 minutes) for dynamic content */
  SHORT: 'public, max-age=180, s-maxage=300',
  /** Medium cache (5-10 minutes) for semi-static content */
  MEDIUM: 'public, max-age=300, s-maxage=600',
  /** Long cache (1 hour) for static content */
  LONG: 'public, max-age=3600, s-maxage=7200',
  /** Aggressive cache with stale-while-revalidate for static data */
  STATIC: 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
  /** Very long cache for immutable content */
  IMMUTABLE: 'public, max-age=31536000, immutable',
} as const;

/**
 * Options for creating API responses
 */
export interface CreateResponseOptions {
  /** HTTP status code (default: 200) */
  status?: number;
  /** Cache control header value */
  cacheControl?: string;
  /** Additional headers to set */
  headers?: Record<string, string>;
  /** Whether this is a cached response */
  cached?: boolean;
  /** Cache age in seconds (for cached responses) */
  cacheAge?: number;
}

/**
 * Creates a standardized success response
 * 
 * @param data - The response data
 * @param options - Response options
 * @returns NextResponse with standardized format
 */
export function createSuccessResponse(
  data: any,
  options: CreateResponseOptions = {}
): NextResponse {
  const {
    status = 200,
    cacheControl,
    headers = {},
    cached = false,
    cacheAge,
  } = options;

  const responseData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    ...(cached && { cached: true }),
    ...(cacheAge !== undefined && { cacheAge }),
  };

  const response = NextResponse.json(responseData, { status });

  // Set cache control if provided
  if (cacheControl) {
    response.headers.set('Cache-Control', cacheControl);
  }

  // Set additional headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Creates a standardized error response
 * 
 * @param error - Error message or Error object
 * @param status - HTTP status code (default: 500)
 * @param details - Additional error details
 * @returns NextResponse with error format
 */
export function createErrorResponse(
  error: string | Error,
  status: number = 500,
  details?: any
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorDetails = error instanceof Error ? error.stack : details;

  return NextResponse.json(
    {
      error: errorMessage,
      ...(errorDetails && { details: errorDetails }),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Sets cache headers on a NextResponse
 * 
 * @param response - The NextResponse to modify
 * @param cacheControl - Cache control header value or preset name
 * @param additionalHeaders - Additional headers to set
 * @returns The modified response
 */
export function setCacheHeaders(
  response: NextResponse,
  cacheControl: string,
  additionalHeaders?: Record<string, string>
): NextResponse {
  response.headers.set('Cache-Control', cacheControl);

  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

/**
 * Creates a response for albums data with standardized format
 * 
 * @param albums - Array of albums
 * @param options - Response options
 * @returns NextResponse with albums data
 */
export function createAlbumsResponse(
  albums: any[],
  options: CreateResponseOptions & {
    errors?: Array<{ feedId: string; error: string }>;
    source?: string;
    static?: boolean;
    fallback?: boolean;
  } = {}
): NextResponse {
  const {
    errors,
    source,
    static: isStatic,
    fallback,
    ...responseOptions
  } = options;

  const data = {
    albums,
    count: albums.length,
    ...(errors && errors.length > 0 && { errors }),
    ...(source && { source }),
    ...(isStatic !== undefined && { static: isStatic }),
    ...(fallback !== undefined && { fallback }),
  };

  return createSuccessResponse(data, responseOptions);
}

