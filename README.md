# RSS Music Site Template

A Lightning Network-powered Value4Value music platform template for bands and artists with existing RSS feeds. Built with Next.js, featuring instant Bitcoin payments, Nostr integration, and Podcasting 2.0 support.

> **Note**: This is a template repository. Clone it and customize it for your band or music project.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   # For Lightning-enabled development (recommended)
   cp env.lightning.template .env.local
   
   # OR for basic music-only development
   cp env.basic.template .env.local
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Environment Configuration

### Development Modes

The template supports two development modes:

#### Lightning Mode (Recommended)
- **File**: `env.lightning.template` → `.env.local`
- **Features**: Full Lightning Network payments, boost functionality, Nostr integration
- **Use case**: Complete Value4Value music platform

#### Basic Mode
- **File**: `env.basic.template` → `.env.local`
- **Features**: Music streaming only, no Lightning payments
- **Use case**: Simple music site without payment features

### Environment Variables

Key environment variables you can customize in `.env.local`:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Lightning Features (true/false)
NEXT_PUBLIC_ENABLE_LIGHTNING=true

# Optional: CDN for production
# NEXT_PUBLIC_CDN_URL=https://your-cdn.com

# Optional: Database (for advanced features)
# POSTGRES_URL=postgresql://username:password@host:port/database

# Optional: Podcast Index API
# PODCAST_INDEX_API_KEY=your-api-key
# PODCAST_INDEX_API_SECRET=your-api-secret
```

## Configuration

### For Bands/Artists

**Requirements:**
- Existing RSS feeds with Podcasting 2.0 value tags
- Lightning payment info already in your feeds
- At least one album or publisher feed

**Quick Setup:**
1. Copy `env.lightning.template` to `.env.local`
2. Configure your site:
   - Set `NEXT_PUBLIC_SITE_NAME` to your site/brand name (defaults to "Music Site")
   - Set `NEXT_PUBLIC_SITE_URL` to your production URL
   - Set `ADMIN_PASSPHRASE` to a secure passphrase for admin access (defaults to "admin")
3. Edit `data/feeds.json` with your RSS feed URLs
4. Run `npm run dev`

### Site Branding

Customize your site name and branding via environment variables:

```bash
# Site name displayed throughout the site
NEXT_PUBLIC_SITE_NAME="Your Music Site Name"

# Admin panel passphrase
ADMIN_PASSPHRASE="your-secure-passphrase"
```

The site name will appear in:
- Page titles and metadata
- Navigation breadcrumbs
- PWA install prompts
- Admin panel headers

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run dev-setup` - Check environment configuration
- `npm run test-feeds` - Test RSS feed parsing
- `npm run auto-add-publishers` - Auto-generate publisher feeds

## Features

### Core Functionality
- **Lightning Network Payments**: Instant Bitcoin payments via Bitcoin Connect
- **Value4Value Model**: Support artists directly with Lightning zaps and value splits
- **Auto Boost System**: Automatic 25 sat payments when songs complete
- **Boostagrams**: Custom 250-character messages with Lightning boost payments
- **Nostr Integration**: NIP-57/NIP-73 compliant boost notes with boostagrams published to Nostr relays
- **Multi-Payment Recipients**: Automatic splitting to multiple Lightning addresses and nodes
- **RSS Feed Parsing**: Dynamic parsing of album and publisher feeds
- **Complete Content Coverage**: All configured albums and tracks
- **Publisher System**: Dedicated pages for music publishers with artwork  
- **Audio Streaming**: Full-featured audio player with playlist support
- **Content Filtering**: Albums, EPs, Singles, and Publishers views
- **Static Data Generation**: Fast loading with pre-generated content
- **Robust Caching**: Fixed RSS cache key system prevents feed collisions

### User Experience
- **Progressive Web App (PWA)**: Install on mobile devices
- **Responsive Design**: Optimized for all screen sizes
- **Boost Modal System**: Elegant popup modals for Lightning payments with album artwork headers
- **Mobile-Optimized Modals**: Vertically centered modals with touch-friendly controls
- **Dark Theme**: Elegant dark interface throughout
- **Smooth Animations**: Polished transitions and hover effects with confetti celebrations
- **Mobile-First**: Touch-friendly controls and navigation

### Technical Features
- **CDN Integration**: Optional CDN support for optimized asset delivery
- **HLS Audio Support**: Adaptive streaming for various audio formats
- **Service Worker**: Background updates and offline functionality
- **Static Site Generation**: Pre-rendered pages for optimal performance

## Architecture

- **Frontend**: Next.js 15.4.3 with TypeScript and App Router
- **Data Source**: RSS feeds with Podcasting 2.0 value tags (no database required)
- **Styling**: Tailwind CSS with custom components and dark theme
- **Audio Engine**: Custom AudioContext with HLS.js support and playlist management
- **Image Processing**: Next.js Image optimization with CDN fallbacks
- **Caching System**: Robust RSS cache with unique base64 keys per feed
- **PWA Support**: Service worker with offline functionality
- **Lightning Integration**: Bitcoin Connect with WebLN and NWC support
- **Payment Methods**: Lightning addresses, node keysends, and multi-recipient splits
- **Nostr Integration**: NIP-57/NIP-73 boost notes with automatic relay publishing
- **Value Splits**: Lightning Network value tag parsing for payment distribution
- **Deployment**: Vercel with automated builds and edge deployment

## Content Structure

### Feed Types
- **Album Feeds**: Individual album or EP releases
- **Publisher Feeds**: Consolidated feeds for all releases from an artist/label

### Requirements
- RSS feeds must include Podcasting 2.0 `<podcast:value>` tags
- Lightning payment splits must be configured in feeds
- Valid audio enclosures (MP3 or supported formats)

### Data Flow
1. **RSS Feed Parsing**: Feeds parsed with individual caching per URL
2. **Content Normalization**: Album and track data extracted and standardized
3. **Static Generation**: Pre-built JSON files for optimal loading performance
4. **API Distribution**: Content served via optimized API routes
5. **Real-time Updates**: Dynamic parsing ensures content freshness
6. **Error Handling**: Comprehensive retry logic and graceful fallbacks

## Development

The app uses a hybrid approach:
- **Static data** for fast initial loads
- **Dynamic parsing** for real-time RSS feed updates
- **Intelligent caching** with unique cache keys to prevent feed collisions
- **Comprehensive coverage** of all configured albums, EPs, and singles

## Lightning Network & Value4Value

### Payment Features
- **Bitcoin Connect Integration**: WebLN and NWC wallet support
- **Multi-Recipient Payments**: Automatic splitting to artists, collaborators, and platform
- **Lightning Addresses**: Full LNURL support for email-style Lightning payments
- **Node Keysends**: Direct payments to Lightning node public keys
- **Value Splits**: Podcasting 2.0 value tag parsing for payment distribution

### Nostr Integration
- **Boost Notes**: NIP-57/NIP-73 compliant boost posts to Nostr relays
- **Relay Publishing**: Automatic posting to Primal, Snort, Nostr Band, Fountain, and Damus
- **Profile Integration**: Nostr profile links and nevent generation
- **Podcast Metadata**: Rich boost content with album art and track information

### Supported Payment Methods
- **WebLN**: Browser extension wallets (Alby, Zeus, etc.)
- **NWC (Nostr Wallet Connect)**: Alby Hub, Mutiny, and other NWC-compatible wallets
- **Lightning Addresses**: chadf@getalby.com, user@strike.me, etc.
- **Node Pubkeys**: Direct keysend to Lightning node addresses

## API Endpoints

### Album Data
- `GET /api/albums-static-cached` - Cached album data (fast)
- `GET /api/albums-no-db` - Fresh album data (dynamic parsing)
- `GET /api/albums-static` - Static pre-generated album data
- `GET /api/album/[id]` - Single album endpoint with static fallback

### Feed Management
- **RSS Cache Location**: `/data/rss-cache/`
- **Feed Configuration**: `/data/feeds.json`
- **Static Data**: `/data/static/albums.json`

## Troubleshooting

### Missing Albums
If albums are not displaying:
1. Check RSS cache: `ls -la data/rss-cache/`
2. Clear cache: `rm -rf data/rss-cache/*`
3. Test feeds: `npm run test-feeds`
4. Update static data: `./scripts/update-static-data.sh`

### RSS Feed Issues
- **Cache collisions**: Fixed in `lib/rss-cache.ts` - cache keys use full base64 encoding
- **Rate limiting**: Built-in retry logic with exponential backoff
- **Invalid feeds**: Comprehensive error handling and logging

### Performance
- **Slow loading**: Check CDN configuration and static generation
- **Audio issues**: Verify HLS.js and AudioContext browser support
- **Cache problems**: Clear browser cache and RSS cache directory

### Lightning Payment Issues
- **Wallet not connecting**: Check Bitcoin Connect status and wallet compatibility
- **Payment failures**: Verify Lightning address validity and node connectivity
- **NWC issues**: Confirm Nostr Wallet Connect string and relay connectivity
- **Missing recipients**: Check album value tags and payment recipient parsing

## Template Notes

### Example Data
All example data has been cleared from:
- `public/publishers.json`
- `public/static-albums.json`
- `public/albums-static-cached.json`
- `data/static/albums.json`

These will be populated when you add your own RSS feeds.

## Contributing

This is a template repository for musicians and bands. Fork it, customize it, and build your own Value4Value music platform!

### Adding New Content
1. Add RSS feed URL to `/data/feeds.json`
2. Test feed parsing with `npm run test-feeds`
3. Update static data with `./scripts/update-static-data.sh`
4. Verify content appears at `http://localhost:3000`
5. Test Lightning payments and value splits for new albums

### Lightning Integration
- **Wallet Testing**: Test with multiple wallet types (WebLN, NWC, Lightning addresses)
- **Value Splits**: Verify payment recipient parsing and distribution
- **Nostr Integration**: Confirm boost notes publish to relays correctly
- **Performance**: Monitor payment recipient detection for render optimization

## Example Implementations

This template was originally created for a multi-artist platform. You can customize it for:
- Single band/artist sites
- Record label catalogs
- Music collective platforms
- Podcast networks with music content

Deploy your customized version to Vercel, Netlify, or any Next.js hosting platform.
