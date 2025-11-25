#!/usr/bin/env node

/**
 * Generic feed update script
 * 
 * Usage: node scripts/update-feed.js <feed-id> <feed-url>
 * Example: node scripts/update-feed.js my-feed https://example.com/feed.xml
 * 
 * This script fetches a specific RSS feed and updates it in parsed-feeds.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { XMLParser } = require('fast-xml-parser');

async function fetchFeed(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function updateFeed(feedId, feedUrl) {
  if (!feedId || !feedUrl) {
    console.error('❌ Error: Both feed-id and feed-url are required');
    console.log('Usage: node scripts/update-feed.js <feed-id> <feed-url>');
    process.exit(1);
  }

  console.log(`🔄 Fetching feed: ${feedUrl}...`);
  
  try {
    // Fetch the feed
    const feedContent = await fetchFeed(feedUrl);
    
    // Parse the XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
      parseTrueNumberOnly: true,
      parseTagValue: true,
      ignoreNameSpace: true
    });
    
    const parsedData = parser.parse(feedContent);
    const channel = parsedData.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    
    console.log(`📻 Found ${items.length} items in feed`);
    if (items.length > 0) {
      console.log(`🎵 Latest item: "${items[0].title}" - ${items[0].pubDate || 'no date'}`);
    }
    
    // Read current parsed-feeds.json
    const parsedFeedsPath = path.join(process.cwd(), 'data', 'parsed-feeds.json');
    
    if (!fs.existsSync(parsedFeedsPath)) {
      console.error('❌ parsed-feeds.json not found. Please ensure the file exists.');
      process.exit(1);
    }
    
    const currentData = JSON.parse(fs.readFileSync(parsedFeedsPath, 'utf-8'));
    
    // Find and update the feed
    const feedIndex = currentData.feeds.findIndex(f => f.id === feedId);
    
    if (feedIndex !== -1) {
      // Update the tracks
      const tracks = items.map((item, index) => ({
        title: item.title,
        url: item.enclosure?.['@_url'] || item.enclosure?.url || '',
        duration: item['itunes:duration'] || item.duration || 0,
        trackNumber: index + 1,
        pubDate: item.pubDate,
        guid: item.guid,
        description: item.description || '',
        image: item['itunes:image']?.['@_href'] || null,
        link: item.link || ''
      }));
      
      if (currentData.feeds[feedIndex].parsedData?.album) {
        currentData.feeds[feedIndex].parsedData.album.tracks = tracks;
      }
      currentData.feeds[feedIndex].lastParsed = new Date().toISOString();
      currentData.feeds[feedIndex].parseStatus = 'success';
      
      // Save updated data
      fs.writeFileSync(parsedFeedsPath, JSON.stringify(currentData, null, 2));
      
      console.log(`✅ Successfully updated feed: ${feedId}`);
      console.log(`📊 Total items: ${tracks.length}`);
      if (tracks.length > 0) {
        console.log(`🆕 Latest: ${tracks[0].title}`);
      }
    } else {
      console.error(`❌ Feed with id "${feedId}" not found in parsed-feeds.json`);
      console.log('Available feed IDs:', currentData.feeds.map(f => f.id).join(', '));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error updating feed:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const feedId = process.argv[2];
const feedUrl = process.argv[3];

// Run the update
updateFeed(feedId, feedUrl);

