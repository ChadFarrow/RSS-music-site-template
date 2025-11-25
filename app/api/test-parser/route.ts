import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test the RSS feed parser with a sample feed
    // In production, users should provide their own test feed URL via query parameter
    const testFeedUrl = request.nextUrl.searchParams.get('url') || 'https://feeds.buzzsprout.com/2181713.rss';
    const response = await fetch(testFeedUrl);
    const xmlText = await response.text();
    
    // Test XML parsing
    const { DOMParser } = await import('@xmldom/xmldom');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Extract basic info
    const channels = xmlDoc.getElementsByTagName('channel');
    const channel = channels[0];
    const title = channel?.getElementsByTagName('title')[0]?.textContent?.trim();
    const items = xmlDoc.getElementsByTagName('item');
    
    return NextResponse.json({
      message: 'Parser test',
      title: title,
      itemCount: items.length,
      firstItemTitle: items[0]?.getElementsByTagName('title')[0]?.textContent?.trim(),
      xmlLength: xmlText.length
    });
  } catch (error) {
    console.error('Test parser error:', error);
    return NextResponse.json({ 
      error: 'Failed to test parser',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 