'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components with no SSR
const LightningWallet = dynamic(
  () => import('./LightningWallet').then(mod => ({ default: mod.LightningWallet })),
  { 
    ssr: false,
    loading: () => <div className="p-2 rounded-lg bg-gray-800 animate-pulse w-16 h-10" />
  }
);

const LightningPayment = dynamic(
  () => import('./LightningPayment').then(mod => ({ default: mod.LightningPayment })),
  { 
    ssr: false,
    loading: () => (
      <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500/50 text-black font-semibold rounded-lg animate-pulse">
        Loading...
      </button>
    )
  }
);

export function ClientOnlyLightningWallet() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-2 rounded-lg bg-gray-800 animate-pulse w-16 h-10" />;
  }

  return <LightningWallet />;
}

interface ClientOnlyLightningPaymentProps {
  recipientName?: string;
  recipientPubkey?: string;
  defaultAmount?: number;
  description?: string;
  onSuccess?: (preimage: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ClientOnlyLightningPayment(props: ClientOnlyLightningPaymentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500/50 text-black font-semibold rounded-lg animate-pulse">
        Loading...
      </button>
    );
  }

  return <LightningPayment {...props} />;
}