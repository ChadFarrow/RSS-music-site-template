#!/usr/bin/env node

/**
 * Development Setup Script
 *
 * This script helps manage the environment configuration for:
 * - Local development (localhost:3000) - uses original RSS feed URLs
 * - Production - optional CDN support for assets
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '..', '.env.local');

async function checkEnvironment() {
  console.log('🔍 Checking environment configuration...\n');
  
  try {
    const envContent = await fs.readFile(ENV_FILE, 'utf8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
    
    console.log('📋 Current environment variables:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('   NEXT_PUBLIC_CDN_URL:', envVars.NEXT_PUBLIC_CDN_URL || 'Not set (CDN optional)');
    
    console.log('\n🎯 Environment behavior:');
    if (process.env.NODE_ENV === 'production') {
      console.log('   ✅ Production mode: Will use CDN URLs for RSS feeds');
      console.log('   ✅ Production mode: Will use CDN for static assets');
    } else {
      console.log('   🏠 Development mode: Will use original RSS feed URLs');
      console.log('   🏠 Development mode: Will use local static assets');
    }
    
  } catch (error) {
    console.log('⚠️  .env.local file not found or not readable');
    console.log('   Create .env.local with your environment variables');
  }
}

async function showUsage() {
  console.log('\n📖 Usage:');
  console.log('   npm run dev-setup          - Check current environment');
  console.log('   npm run seed-db            - Seed database with feeds from feeds.json');
  console.log('   npm run dev                - Start local development server');
  console.log('   npm run build              - Build for production');
  console.log('   npm run start              - Start production server');
  console.log('   vercel --prod              - Deploy to production');
  
  console.log('\n🔧 Optional Environment Variables (for .env.local):');
  console.log('   NEXT_PUBLIC_CDN_URL=https://your-cdn.example.com (optional)');
  
  console.log('\n🚀 Workflow:');
  console.log('   1. Configure feeds in data/feeds.json');
  console.log('   2. Local development: npm run dev');
  console.log('   3. Test changes locally');
  console.log('   4. Deploy to production: vercel --prod (or your hosting platform)');
  console.log('   5. Optional: Configure CDN for static assets');
}

async function main() {
  console.log('🎵 Music Site - Development Environment Setup\n');
  
  await checkEnvironment();
  await showUsage();
  
  console.log('\n✅ Setup complete! Your environment is configured for both local development and production.');
}

main().catch(console.error); 