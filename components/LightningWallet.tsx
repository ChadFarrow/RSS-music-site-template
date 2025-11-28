'use client';

import { useState, useEffect } from 'react';
import { Zap, Wallet, X, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useNWC } from '@/hooks/useNWC';

export function LightningWallet() {
  const [isOpen, setIsOpen] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [inputConnection, setInputConnection] = useState('');
  const [copied, setCopied] = useState(false);
  
  const {
    isConnected,
    balance,
    error,
    loading,
    connect,
    disconnect,
    refreshBalance
  } = useNWC();

  useEffect(() => {
    if (isConnected) {
      setShowConnectForm(false);
      setInputConnection('');
    }
  }, [isConnected]);

  const handleConnect = async () => {
    if (inputConnection.trim()) {
      await connect(inputConnection.trim());
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your wallet?')) {
      disconnect();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBalance = (sats: number) => {
    console.log('🎯 Formatting balance - input:', sats, 'type:', typeof sats);
    // Fix: Correct thresholds for sat formatting
    if (sats >= 100000000) { // 100 million sats = 1 BTC
      const formatted = `${(sats / 100000000).toFixed(2)} BTC`;
      console.log('🎯 Formatted as BTC:', formatted);
      return formatted;
    } else if (sats >= 1000000) { // 1 million sats
      const formatted = `${(sats / 1000000).toFixed(2)}M sats`;
      console.log('🎯 Formatted as M sats:', formatted);
      return formatted;
    } else if (sats >= 1000) { // 1 thousand sats
      const formatted = `${(sats / 1000).toFixed(1)}k sats`;
      console.log('🎯 Formatted as k sats:', formatted);
      return formatted;
    }
    const formatted = `${sats} sats`;
    console.log('🎯 Formatted as plain sats:', formatted);
    return formatted;
  };

  return (
    <>
      {/* Wallet Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        aria-label="Lightning Wallet"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          {isConnected && balance !== null && (
            <span className="text-sm font-medium text-gray-200">
              {formatBalance(balance)}
            </span>
          )}
        </div>
        {isConnected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Wallet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Lightning Wallet</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
              )}

              {!loading && !isConnected && !showConnectForm && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400 mb-6">
                      Connect your Lightning wallet to enable payments
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowConnectForm(true)}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
                  >
                    Connect with NWC
                  </button>

                  <div className="text-sm text-gray-500 text-center">
                    <p>Supported wallets:</p>
                    <p className="mt-1">Alby, Mutiny, NWC-compatible wallets</p>
                  </div>
                </div>
              )}

              {!loading && !isConnected && showConnectForm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      NWC Connection String
                    </label>
                    <textarea
                      value={inputConnection}
                      onChange={(e) => setInputConnection(e.target.value)}
                      placeholder="nostr+walletconnect://..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowConnectForm(false);
                        setInputConnection('');
                      }}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConnect}
                      disabled={!inputConnection.trim()}
                      className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold rounded-lg transition-colors"
                    >
                      Connect
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    <p>Get your NWC connection string from your wallet app</p>
                    <a
                      href="https://nwc.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-500 hover:underline"
                    >
                      Learn more about NWC
                    </a>
                  </div>
                </div>
              )}

              {!loading && isConnected && (
                <div className="space-y-6">
                  {/* Balance */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">Balance</p>
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-8 h-8 text-yellow-500" />
                      <p className="text-3xl font-bold text-white">
                        {balance !== null ? formatBalance(balance) : '---'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-sm font-medium">Connected</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={refreshBalance}
                      className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Refresh Balance
                    </button>
                    
                    <button
                      onClick={handleDisconnect}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                    >
                      Disconnect Wallet
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 text-center">
                      Your wallet is connected via NWC (Nostr Wallet Connect)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}