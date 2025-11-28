// API endpoint to manually trigger feed processing
// Also initializes auto feed processor if not already running

import { NextRequest, NextResponse } from 'next/server';
import { triggerFeedProcessing, startAutoFeedProcessor } from '@/lib/auto-feed-processor';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Ensure auto processor is started
    startAutoFeedProcessor();
    
    // Trigger immediate processing
    await triggerFeedProcessing();
    
    return NextResponse.json({
      success: true,
      message: 'Feeds processed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing feeds:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Just ensure auto processor is started
  startAutoFeedProcessor();
  
  return NextResponse.json({
    status: 'auto-processor-active',
    message: 'Auto feed processor is running',
    timestamp: new Date().toISOString(),
  });
}

