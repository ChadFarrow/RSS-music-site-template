# RSS Music Site Template

A Lightning Network-powered Value4Value music platform template for bands and artists with existing RSS feeds. Built with Next.js, featuring instant Bitcoin payments, Nostr integration, and Podcasting 2.0 support.

> **Note**: This is a template repository. Click the green "Use this template" button above to create your own copy, or clone it to customize for your band or music project.

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
NEXT_PUBLIC_SITE_NAME="Your Music Site Name"  # Site branding (defaults to "Music Site")
ADMIN_PASSPHRASE=admin  # Admin panel passphrase (change this!)

# Lightning Features (true/false)
NEXT_PUBLIC_ENABLE_LIGHTNING=true

# Optional: CDN for production
# NEXT_PUBLIC_CDN_URL=https://your-cdn.com

# Optional: Database (for advanced features)
# POSTGRES_URL=postgresql://username:password@host:port/database

# Optional: Podcast Index API
# PODCAST_INDEX_API_KEY=your-api-key
# PODCAST_INDEX_API_SECRET=your-api-secret

# Optional: Site Nostr Account (for permanent Nostr identity)
# Generate with: node scripts/generate-nostr-keys.js
# NEXT_PUBLIC_SITE_NOSTR_NSEC=nsec1...
# NEXT_PUBLIC_SITE_NOSTR_NPUB=npub1...
```

## Configuration

### For Bands/Artists

**Minimum Requirements:**
- RSS feeds with your music (that's all you need!)

**Optional (can add later):**
- Lightning payment info in your feeds (for Value4Value payments)
- Podcasting 2.0 value tags (for automatic payment splitting)

**Quick Setup:**
1. Copy `env.lightning.template` to `.env.local` (or `env.basic.template` if you don't want Lightning features)
2. Configure your site:
   - Set `NEXT_PUBLIC_SITE_NAME` to your site/brand name (defaults to "Music Site")
   - Set `ADMIN_PASSPHRASE` to a secure passphrase for admin access (defaults to "admin")
   - Set `NEXT_PUBLIC_ENABLE_LIGHTNING=false` if you don't want Lightning features
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

### Utility Scripts

- `node scripts/generate-nostr-keys.js` - Generate Nostr keys for site account
- `node scripts/update-feed.js <feed-id> <feed-url>` - Update a specific feed in parsed-feeds.json
- `./scripts/update-static-data.sh` - Update static album cache

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

#### Setting Up Site Nostr Account (Optional)

To give your site a permanent Nostr identity for posting boosts:

1. **Generate Nostr keys:**
   ```bash
   node scripts/generate-nostr-keys.js
   ```

2. **Add to your `.env.local`:**
   ```bash
   NEXT_PUBLIC_SITE_NOSTR_NSEC=nsec1...
   NEXT_PUBLIC_SITE_NOSTR_NPUB=npub1...
   ```

3. **Benefits:**
   - All boosts posted from your site's account
   - Users can follow your site's Nostr profile
   - Boosts page aggregates all site boosts
   - Consistent branding across Nostr network

**Note:** If not configured, the site will auto-generate keys per user (stored in browser localStorage).

### Supported Payment Methods
- **WebLN**: Browser extension wallets (Alby, Zeus, etc.)
- **NWC (Nostr Wallet Connect)**: Alby Hub, Mutiny, and other NWC-compatible wallets
- **Lightning Addresses**: chadf@getalby.com, user@strike.me, etc.
- **Node Pubkeys**: Direct keysend to Lightning node addresses

## Deployment

### Prerequisites

**All you need to get started:**
- RSS feeds with your music (that's it!)
- An email address (to create free accounts)

**Optional features** (can be added later):
- Lightning payments (requires Lightning wallet)
- Nostr integration (requires Nostr account)
- Custom domain (you can use the free `.vercel.app` domain)

### Step-by-Step Deployment Guide

This guide assumes you're starting from scratch with just your RSS feeds.

#### Step 1: Create a GitHub Account (Free)

1. Go to [github.com](https://github.com) and click "Sign up"
2. Create a free account (no credit card required)
3. Verify your email address

#### Step 2: Create Your Site from This Template

**Option A: Use GitHub Template (Easiest - Recommended)**

1. **On this repository page, click the green "Use this template" button**
2. **Select "Create a new repository"**
3. **Name your repository** (e.g., "my-music-site")
4. **Choose public or private** (your choice)
5. **Click "Create repository from template"**
6. **Your new repository is ready!** It's a copy of this template without the git history

**Option B: Clone the Repository (If You Prefer)**

If you're comfortable with Git:
```bash
git clone https://github.com/ChadFarrow/RSS-music-site-template.git my-music-site
cd my-music-site
# Edit your files, then push to your own GitHub repository
```

**After creating your repository:**

1. **Edit `data/feeds.json`** with your RSS feed URLs
2. **Edit environment variables** (see Configuration section below)
3. **Commit your changes** (GitHub web interface has an "Edit" button, or use Git)

#### Step 3: Create a Vercel Account (Free)

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" and choose "Continue with GitHub"
3. Authorize Vercel to access your GitHub account
4. Complete the signup (no credit card required)

#### Step 4: Deploy Your Site

1. **In Vercel dashboard:**
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will automatically detect it's a Next.js project

2. **Configure your site:**
   - **Project Name**: Your site name (or leave default)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)

3. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```bash
   NEXT_PUBLIC_SITE_NAME=Your Music Site Name
   ADMIN_PASSPHRASE=choose-a-secure-password
   NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app
   ```
   
   **Optional** (only if you want Lightning payments):
   ```bash
   NEXT_PUBLIC_ENABLE_LIGHTNING=true
   ```
   
   **Optional** (only if you want Nostr integration):
   ```bash
   NEXT_PUBLIC_SITE_NOSTR_NSEC=nsec1... (generate with: node scripts/generate-nostr-keys.js)
   NEXT_PUBLIC_SITE_NOSTR_NPUB=npub1...
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for the build to complete
   - Your site will be live at `https://your-site.vercel.app`

#### Step 5: Add Your RSS Feeds

1. **After deployment, edit your feeds:**
   - Go to your GitHub repository
   - Edit `data/feeds.json`
   - Add your RSS feed URLs
   - Commit the changes

2. **Vercel will automatically redeploy** when you push changes to GitHub

#### That's It!

Your music site is now live and free! The free tier includes:
- ✅ 100GB bandwidth/month
- ✅ Unlimited requests
- ✅ Free SSL certificate
- ✅ Global CDN
- ✅ Automatic deployments

**Cost:** $0/month - perfect for music sites!

### Optional: Custom Domain

If you have your own domain:
1. Go to your Vercel project settings
2. Click "Domains"
3. Add your domain
4. Follow the DNS configuration instructions
5. Free SSL certificate is included automatically

### Alternative Hosting (If You Prefer)

- **Netlify**: Similar free tier, also easy to use
- **Railway**: Free tier with $5 credit/month
- **Render**: Free tier (spins down after inactivity)

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
