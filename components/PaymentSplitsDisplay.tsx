'use client';

import { useState } from 'react';
import { PaymentRecipient } from '@/lib/types/album';

interface PaymentSplitsDisplayProps {
  recipients: PaymentRecipient[] | null | undefined;
  totalAmount: number;
  fallbackRecipient?: { address: string; name?: string };
}

export default function PaymentSplitsDisplay({ 
  recipients, 
  totalAmount,
  fallbackRecipient 
}: PaymentSplitsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Determine which recipients to display
  let displayRecipients: PaymentRecipient[] = [];
  
  if (recipients && recipients.length > 0) {
    displayRecipients = recipients.filter(r => r.address && (r.split > 0 || r.fixedAmount));
  } else if (fallbackRecipient) {
    displayRecipients = [{
      address: fallbackRecipient.address,
      split: 100,
      name: fallbackRecipient.name || 'Recipient'
    }];
  }

  if (displayRecipients.length === 0) {
    return null;
  }

  // Calculate total split for proportional calculations
  const totalSplit = displayRecipients.reduce((sum, r) => sum + r.split, 0);

  // Calculate amounts for each recipient
  const recipientAmounts = displayRecipients.map(recipient => {
    const amount = recipient.fixedAmount || Math.floor((totalAmount * recipient.split) / totalSplit);
    const percentage = totalSplit > 0 ? Math.round((recipient.split / totalSplit) * 100) : 0;
    return {
      name: recipient.name || 'Recipient',
      address: recipient.address,
      amount,
      percentage,
      split: recipient.split
    };
  });

  // Calculate total to verify it matches (accounting for rounding)
  const calculatedTotal = recipientAmounts.reduce((sum, r) => sum + r.amount, 0);
  const hasRoundingDifference = calculatedTotal !== totalAmount;

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm font-medium">Payment Distribution</label>
          {displayRecipients.length > 0 && (
            <span className="text-gray-500 text-xs">
              ({displayRecipients.length} {displayRecipients.length === 1 ? 'recipient' : 'recipients'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Total: {totalAmount} sats</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          <div className="space-y-2">
            {recipientAmounts.map((recipient, index) => (
              <div 
                key={`${recipient.address}-${index}`}
                className="flex items-center justify-between py-2 px-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {recipient.name}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {recipient.percentage}% split
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-yellow-400 text-sm font-semibold">
                    {recipient.amount} sats
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasRoundingDifference && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Note: {totalAmount - calculatedTotal} sats difference due to rounding
            </div>
          )}

          {displayRecipients.length > 1 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Split Total:</span>
                <span className="text-gray-300 font-medium">{totalSplit}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

