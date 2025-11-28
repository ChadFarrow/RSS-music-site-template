import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Return empty feeds configuration since we're removing all RSS feed content
  return NextResponse.json({
    core: [],
    extended: [],
    low: [],
    publisher: [],
    all: []
  });
}