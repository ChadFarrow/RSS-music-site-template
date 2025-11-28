// Utility to save extracted colors to albums-with-colors.json

import fs from 'fs';
import path from 'path';
import type { ExtractedColors } from './color-utils';

export interface AlbumWithColors {
  title: string;
  artist?: string;
  coverArt?: string;
  colors?: ExtractedColors;
  tracks?: Array<{
    title: string;
    image?: string;
    colors?: ExtractedColors;
  }>;
}

interface ColorDataFile {
  albums: AlbumWithColors[];
}

const COLOR_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'albums-with-colors.json');

/**
 * Load existing color data from file
 */
export function loadColorData(): ColorDataFile {
  try {
    if (!fs.existsSync(COLOR_DATA_PATH)) {
      return { albums: [] };
    }
    
    const content = fs.readFileSync(COLOR_DATA_PATH, 'utf-8');
    const data = JSON.parse(content) as ColorDataFile;
    
    return data.albums ? data : { albums: [] };
  } catch (error) {
    console.warn('⚠️ Failed to load color data, starting fresh:', error);
    return { albums: [] };
  }
}

/**
 * Save color data to file
 */
export function saveColorData(data: ColorDataFile): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(COLOR_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file with pretty formatting
    fs.writeFileSync(COLOR_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Saved color data for ${data.albums.length} albums`);
  } catch (error) {
    console.error('❌ Failed to save color data:', error);
    throw error;
  }
}

/**
 * Update or add colors for an album
 */
export function updateAlbumColors(
  albumTitle: string,
  colors: ExtractedColors,
  artist?: string,
  trackColors?: Array<{ title: string; image?: string; colors: ExtractedColors }>
): void {
  const data = loadColorData();
  
  // Find existing album or create new one
  let album = data.albums.find(a => a.title.toLowerCase() === albumTitle.toLowerCase());
  
  if (!album) {
    album = {
      title: albumTitle,
      artist,
      colors,
      tracks: trackColors,
    };
    data.albums.push(album);
  } else {
    // Update existing album
    album.colors = colors;
    if (artist) album.artist = artist;
    if (trackColors) {
      album.tracks = trackColors;
    }
  }
  
  saveColorData(data);
}

/**
 * Batch update multiple albums
 */
export function batchUpdateAlbumColors(albums: AlbumWithColors[]): void {
  const data = loadColorData();
  
  for (const newAlbum of albums) {
    const existingIndex = data.albums.findIndex(
      a => a.title.toLowerCase() === newAlbum.title.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing
      data.albums[existingIndex] = {
        ...data.albums[existingIndex],
        ...newAlbum,
      };
    } else {
      // Add new
      data.albums.push(newAlbum);
    }
  }
  
  saveColorData(data);
}

