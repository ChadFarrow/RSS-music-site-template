import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Return empty feeds array since we're removing all RSS feed content
  return NextResponse.json({
    feeds: [],
    lastUpdated: new Date().toISOString()
  });
}