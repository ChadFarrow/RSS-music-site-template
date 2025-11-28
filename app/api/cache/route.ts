import { NextRequest, NextResponse } from 'next/server';
import { RSSCache } from '@/lib/rss-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // Return RSS cache statistics
      const stats = RSSCache.getCacheStats();
      return NextResponse.json({
        success: true,
        stats
      });
    }
    
    if (action === 'clear') {
      // Clear RSS cache
      RSSCache.clear();
      return NextResponse.json({
        success: true,
        message: 'RSS cache cleared'
      });
    }
    
    // Default: return basic info
    const stats = RSSCache.getCacheStats();
    
    return NextResponse.json({
      success: true,
      message: 'RSS Cache API',
      availableActions: ['stats', 'clear'],
      currentStats: stats
    });
    
  } catch (error) {
    console.error('Error in cache API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const feedUrl = searchParams.get('feedUrl');
    
    if (action === 'clear') {
      // Clear RSS cache (specific feed or all)
      if (feedUrl) {
        RSSCache.clear(feedUrl);
        return NextResponse.json({
          success: true,
          message: `RSS cache cleared for: ${feedUrl}`
        });
      } else {
        RSSCache.clear();
        return NextResponse.json({
          success: true,
          message: 'All RSS cache cleared'
        });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action. Use "clear" with optional feedUrl parameter' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error in cache API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 