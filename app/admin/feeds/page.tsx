'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/Toast';
import { getSiteName } from '@/lib/site-config';

interface Feed {
  id: string;
  originalUrl: string;
  type: 'album' | 'publisher';
  title: string;
  priority: 'core' | 'extended' | 'low';
  status: 'active' | 'inactive';
  addedAt: string;
}

export default function AdminFeedsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedType, setNewFeedType] = useState<'album' | 'publisher'>('album');

  // Check if already authenticated on page load
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadFeeds();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        loadFeeds();
        toast.success('Successfully authenticated!');
      } else {
        toast.error('Invalid password');
      }
    } catch (error) {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const loadFeeds = async () => {
    try {
      const response = await fetch('/api/admin/feeds');
      if (response.ok) {
        const data = await response.json();
        setFeeds(data.feeds || []);
      }
    } catch (error) {
      toast.error('Failed to load feeds');
    }
  };

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    const requestBody = {
      url: newFeedUrl.trim(),
      type: newFeedType,
    };

    console.log('Frontend - Sending request:', requestBody);

    setLoading(true);
    try {
      const response = await fetch('/api/admin/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('Frontend - Response status:', response.status);
      console.log('Frontend - Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseData = await response.json();
        console.log('Frontend - Success response:', responseData);
        toast.success('Feed added successfully!');
        setNewFeedUrl('');
        loadFeeds();
      } else {
        const errorText = await response.text();
        console.log('Frontend - Error response text:', errorText);
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        
        console.log('Frontend - Parsed error:', error);
        toast.error(error.message || error.error || 'Failed to add feed');
      }
    } catch (error) {
      console.error('Frontend - Exception caught:', error);
      toast.error('Failed to add feed');
    } finally {
      setLoading(false);
    }
  };

  const removeFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to remove this feed?')) return;

    try {
      const response = await fetch('/api/admin/feeds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId }),
      });

      if (response.ok) {
        toast.success('Feed removed successfully!');
        loadFeeds();
      } else {
        const error = await response.json();
        toast.error(error.message || error.error || 'Failed to remove feed');
      }
    } catch (error) {
      toast.error('Failed to remove feed');
    }
  };

  const reparseAllFeeds = async () => {
    if (!confirm('This will discover podroll feeds from all existing feeds. This may take a few minutes. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      // Get all current feeds
      const response = await fetch('/api/admin/feeds');
      if (!response.ok) {
        throw new Error('Failed to fetch feeds');
      }

      const data = await response.json();
      const existingFeeds = data.feeds || [];
      
      let totalDiscovered = 0;
      let totalAdded = 0;
      let processedCount = 0;

      // Process each feed for podroll discovery
      for (const feed of existingFeeds) {
        try {
          console.log(`Processing feed ${processedCount + 1}/${existingFeeds.length}: ${feed.title}`);
          
          const discoveryResponse = await fetch('/api/admin/discover-podroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: feed.originalUrl,
              recursive: true,
              depth: 2,
              autoAdd: true
            })
          });

          if (discoveryResponse.ok) {
            const discoveryData = await discoveryResponse.json();
            totalDiscovered += discoveryData.stats.total;
            totalAdded += discoveryData.stats.added;
          }
        } catch (error) {
          console.error(`Error processing feed ${feed.title}:`, error);
        }
        processedCount++;
      }

      toast.success(`Reparse complete! Processed ${processedCount} feeds, discovered ${totalDiscovered} connections, added ${totalAdded} new feeds.`);
      
      // Reload the feeds list to show any new additions
      loadFeeds();
      
    } catch (error) {
      console.error('Error reparsing feeds:', error);
      toast.error('Failed to reparse feeds');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-black/50 backdrop-blur-sm rounded-xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-gray-400">Enter password to manage RSS feeds</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Enter admin password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
              title="Back to admin dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">RSS Feed Management</h1>
              <p className="text-gray-400 text-sm">Manage music feeds for {getSiteName()}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Feed Operations</h2>
              <p className="text-gray-400">Add feeds, discover podrolls, and manage the music catalog</p>
            </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/discover"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover Podroll
            </a>
            <button
              onClick={reparseAllFeeds}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Reparsing...' : 'Reparse All Feeds'}
            </button>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Add New Feed Form */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New RSS Feed</h2>
          <form onSubmit={addFeed} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Feed URL
                </label>
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com/feed.xml"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newFeedType}
                  onChange={(e) => setNewFeedType(e.target.value as 'album' | 'publisher')}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="album">Album</option>
                  <option value="publisher">Publisher</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Adding...' : 'Add Feed'}
            </button>
          </form>
        </div>

        {/* Current Feeds */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Current Feeds ({feeds.length})</h2>
          
          {feeds.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No feeds added yet</p>
          ) : (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <div key={feed.id} className="bg-gray-800/30 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{feed.title || 'Untitled Feed'}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        feed.type === 'album' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {feed.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 break-all">{feed.originalUrl}</p>
                    <p className="text-xs text-gray-500">Added: {new Date(feed.addedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => removeFeed(feed.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors ml-4"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">How to Use</h3>
          <ul className="text-blue-200 space-y-2 text-sm">
            <li>• <strong>Album feeds:</strong> RSS feeds that contain a single album or EP</li>
            <li>• <strong>Publisher feeds:</strong> RSS feeds that contain multiple albums from an artist</li>
          </ul>
        </div>
      </div>
    </div>
    </div>
  );
}