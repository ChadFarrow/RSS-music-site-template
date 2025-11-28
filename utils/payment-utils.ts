/**
 * Utility functions for Lightning payments
 */

import { getSiteName } from '@/lib/site-config';
import { PaymentRecipient } from '@/lib/types/album';
import { BoostMetadata } from '@/lib/types/boost';

/**
 * Create TLV records for Lightning boost payments (matching manual boost format)
 * Returns array format compatible with NWC bridge system
 */
function createBoostTLVRecords(metadata: BoostMetadata, recipientName?: string, amount?: number) {
  const tlvRecords = [];

  // Use the same format as manual boosts from BitcoinConnect component
  // 7629169 - Podcast metadata JSON (bLIP-10 standard - Breez/Fountain compatible)
  const podcastMetadata = {
    podcast: metadata.artist || 'Unknown Artist',
    episode: metadata.title || 'Unknown Title',
    action: 'boost',
    app_name: metadata.appName || getSiteName(),
    // Use actual feed URL from metadata
    feed: metadata.feedUrl || '',
    url: metadata.feedUrl || '',
    message: metadata.message || '',
    ...(metadata.timestamp && { ts: metadata.timestamp }),
    // Feed ID should come from feed metadata, not hardcoded
    ...(metadata.feedUrl && { feedId: metadata.feedUrl }),
    // Add Helipad-specific GUID fields
    ...(metadata.itemGuid && { episode_guid: metadata.itemGuid }),
    ...(metadata.itemGuid && { remote_item_guid: metadata.itemGuid }),
    ...(metadata.podcastFeedGuid && { remote_feed_guid: metadata.podcastFeedGuid }),
    ...(metadata.album && { album: metadata.album }),
    ...(amount && { value_msat_total: amount * 1000 }),
    sender_name: metadata.senderName || 'Anonymous',
    uuid: `boost-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Unique identifier
    app_version: '1.0.0', // App version
    ...(amount && { value_msat: amount * 1000 }), // Individual payment amount
    name: recipientName || 'Recipient' // Recipient name from payment split
  };
  
  // Log the exact TLV data for debugging
  console.log('🔍 HELIPAD DEBUG - Exact TLV 7629169 data being sent:');
  console.log(JSON.stringify(podcastMetadata, null, 2));
  
  tlvRecords.push({
    type: 7629169,
    value: Buffer.from(JSON.stringify(podcastMetadata), 'utf8').toString('hex')
  });
  
  // 7629171 - Tip note/message (Lightning spec compliant) - only if custom message provided
  if (metadata.message) {
    tlvRecords.push({
      type: 7629171,
      value: Buffer.from(metadata.message, 'utf8').toString('hex')
    });
  }
  
  // 133773310 - Sphinx compatibility (JSON encoded data)
  const sphinxData = {
    podcast: metadata.artist || 'Unknown Artist',
    episode: metadata.title || 'Unknown Title', 
    action: 'boost',
    app: metadata.appName || getSiteName(),
    message: metadata.message || '',
    ...(amount && { amount: amount }),
    sender: metadata.senderName || 'Anonymous',
    ...(metadata.timestamp && { timestamp: metadata.timestamp })
  };
  
  tlvRecords.push({
    type: 133773310,
    value: Buffer.from(JSON.stringify(sphinxData), 'utf8').toString('hex')
  });

  return tlvRecords;
}

/**
 * Make a Lightning payment using available payment methods (WebLN, NWC bridge, etc.)
 * This function replicates the payment logic from BitcoinConnect component for auto boost
 */
export async function makeAutoBoostPayment({
  amount,
  description,
  recipients,
  fallbackRecipient,
  boostMetadata,
}: {
  amount: number;
  description: string;
  recipients?: PaymentRecipient[];
  fallbackRecipient: string;
  boostMetadata?: BoostMetadata;
}): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    console.log('💡 AUTO BOOST: Using UPDATED makeAutoBoostPayment function (v2)');
    console.log('🚀 Starting auto boost payment:', {
      amount,
      description,
      recipients: recipients?.length || 0,
      fallbackRecipient
    });

    // Import NWC service dynamically
    const { getNWCService } = await import('@/lib/nwc-service');
    
    // Check connection state similar to BitcoinConnect
    const weblnExists = !!(window as any).webln;
    const weblnEnabled = weblnExists && !!(window as any).webln?.enabled;
    
    // Check for NWC connection (same logic as BitcoinConnect component)
    let bcConfig = null;
    let bcConnectorType = null;
    let nwcConnectionString = null;
    
    try {
      const bcConfigRaw = localStorage.getItem('bc:config');
      if (bcConfigRaw) {
        bcConfig = JSON.parse(bcConfigRaw);
        bcConnectorType = bcConfig.connectorType;
        nwcConnectionString = bcConfig.nwcUrl;
      }
    } catch (error) {
      // Fallback to individual keys if config is corrupted
      bcConnectorType = localStorage.getItem('bc:connectorType');
    }
    if (!nwcConnectionString) {
      nwcConnectionString = localStorage.getItem('nwc_connection_string');
    }
    
    const hasNWCConnection = !!nwcConnectionString;
    // Use NWC if we have a connection string, regardless of bcConnectorType
    // This matches how manual payments work in BitcoinConnect component
    const shouldUseNWC = hasNWCConnection;
    
    console.log('💡 AUTO BOOST: Payment method detection:', {
      weblnExists,
      weblnEnabled,
      hasNWCConnection,
      bcConnectorType,
      shouldUseNWC,
      nwcConnectionExists: !!nwcConnectionString,
      nwcStringLength: nwcConnectionString?.length || 0
    });

    // Determine payments to make
    let paymentsToMake: PaymentRecipient[] = [];
    
    if (recipients && recipients.length > 0) {
      paymentsToMake = recipients.filter(r => r.address && (r.split > 0 || r.fixedAmount));
      console.log(`💰 Using ${paymentsToMake.length} recipients (including fixed amounts)`);
    }

    // Fallback to single recipient if no valid recipients
    if (paymentsToMake.length === 0) {
      paymentsToMake = [{
        address: fallbackRecipient,
        split: 100,
        name: 'Default',
        type: 'node'
      }];
      console.log('💰 Using fallback single recipient for auto boost');
    }

    const totalSplit = paymentsToMake.reduce((sum, r) => sum + r.split, 0);
    const results: any[] = [];

    // Use NWC if available and preferred (same logic as BitcoinConnect)
    if (shouldUseNWC && hasNWCConnection) {
      console.log('💡 AUTO BOOST: Using NWC for auto boost payments');
      console.log('💡 AUTO BOOST: NWC connection string length:', nwcConnectionString?.length);
      
      try {
        // Use NWC service directly for auto boost payments
        console.log('💡 AUTO BOOST: Using NWC service for payments...');
        const nwcService = getNWCService();

        // Connect NWC if needed
        if (!nwcService.isConnected()) {
          console.log('💡 AUTO BOOST: Connecting to NWC service...');
          await nwcService.connect(nwcConnectionString);
        }
        console.log('💡 AUTO BOOST: NWC ready for auto boost payments');

        const paymentPromises = paymentsToMake.map(async (recipientData) => {
          const recipientAmount = (recipientData as any).fixedAmount || Math.floor((amount * recipientData.split) / totalSplit);

          console.log(`💰 Auto boost sending ${recipientAmount} sats to ${recipientData.name || recipientData.address}`);

          // Create TLV records for boost metadata
          const tlvRecords = boostMetadata ? createBoostTLVRecords(boostMetadata, recipientData.name, recipientAmount) : undefined;

          let result;
          // Handle different recipient types
          if (recipientData.type === 'lnaddress' || (recipientData.address && recipientData.address.includes('@'))) {
            // For Lightning addresses, resolve to invoice first, then pay
            console.log(`🔗 Auto boost: Resolving Lightning address to invoice: ${recipientData.address}`);
            result = await nwcService.payLightningAddress(
              recipientData.address,
              recipientAmount,
              `Auto boost for ${boostMetadata?.title || 'track'}`
            );
          } else {
            // For node addresses, use keysend
            result = await nwcService.payKeysend(
              recipientData.address,
              recipientAmount,
              tlvRecords
            );
          }
          
          if (result.preimage) {
            console.log(`✅ Auto boost payment successful: ${recipientAmount} sats to ${recipientData.name || recipientData.address}`);
            return { recipient: recipientData.name || recipientData.address, amount: recipientAmount, preimage: result.preimage };
          } else {
            throw new Error(result.error || 'Payment failed');
          }
        });

        const paymentResults = await Promise.allSettled(paymentPromises);
        
        paymentResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const recipientName = paymentsToMake[index].name || paymentsToMake[index].address;
            console.error(`❌ Auto boost payment failed to ${recipientName}:`, result.reason);
          }
        });

        if (results.length > 0) {
          console.log(`✅ Auto boost completed: ${results.length}/${paymentsToMake.length} payments successful`);
          return { success: true, results };
        } else {
          throw new Error('All NWC auto boost payments failed');
        }
        
      } catch (nwcError) {
        console.error('💡 AUTO BOOST: NWC auto boost failed, trying WebLN fallback:', nwcError);
        // Fall through to WebLN
      }
    } else {
      console.log('💡 AUTO BOOST: Skipping NWC - shouldUseNWC:', shouldUseNWC, 'hasNWCConnection:', hasNWCConnection);
    }

    // WebLN fallback (same as original logic)
    if (weblnExists) {
      console.log('💡 AUTO BOOST: Using WebLN for auto boost payments (fallback)');
      
      const webln = (window as any).webln;

      // Ensure WebLN is enabled
      if (!weblnEnabled) {
        await webln.enable();
      }

      // Check if we can use keysend (for node addresses)
      const hasKeysend = typeof webln.keysend === 'function';
      const hasSendPayment = typeof webln.sendPayment === 'function';
      
      // We can process payments if we have either keysend (for node) or sendPayment (for invoices/lnaddress)
      if (hasKeysend || hasSendPayment) {
        const paymentPromises = paymentsToMake.map(async (recipientData) => {
          const recipientAmount = (recipientData as any).fixedAmount || Math.floor((amount * recipientData.split) / totalSplit);
          
          console.log(`💰 WebLN auto boost sending ${recipientAmount} sats to ${recipientData.name || recipientData.address}`);
          
          let response;
          // Handle different recipient types
          if (recipientData.type === 'lnaddress' || (recipientData.address && recipientData.address.includes('@'))) {
            // For Lightning addresses, resolve to invoice first, then pay
            console.log(`🔗 WebLN auto boost: Resolving Lightning address to invoice: ${recipientData.address}`);
            const { LNURLService } = await import('@/lib/lnurl-service');
            const amountMillisats = recipientAmount * 1000;
            const comment = `Auto boost for ${boostMetadata?.title || 'track'}`;
            
            const invoice = await LNURLService.getPaymentInvoice(
              recipientData.address,
              amountMillisats,
              comment
            );
            
            console.log(`💳 WebLN auto boost: Got invoice for ${recipientData.address}, paying with WebLN`);
            response = await webln.sendPayment(invoice);
          } else {
            // For node addresses, use keysend
            // Create TLV records for boost metadata
            const customRecords = boostMetadata ? createBoostTLVRecords(boostMetadata, recipientData.name, recipientAmount) : {};
            
            response = await webln.keysend({
              destination: recipientData.address,
              amount: recipientAmount,
              customRecords
            });
          }
          
          console.log(`✅ WebLN auto boost payment successful: ${recipientAmount} sats to ${recipientData.name || recipientData.address}`);
          return { recipient: recipientData.name || recipientData.address, amount: recipientAmount, response };
        });

        const paymentResults = await Promise.allSettled(paymentPromises);
        
        paymentResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const recipientName = paymentsToMake[index].name || paymentsToMake[index].address;
            console.error(`❌ WebLN auto boost payment failed to ${recipientName}:`, result.reason);
          }
        });

        if (results.length > 0) {
          console.log(`✅ WebLN auto boost completed: ${results.length}/${paymentsToMake.length} payments successful`);
          return { success: true, results };
        } else {
          throw new Error('All WebLN auto boost payments failed');
        }
        } else {
          throw new Error('No payment method available for auto boost (keysend or sendPayment required)');
        }
    } else {
      throw new Error('No payment method available for auto boost');
    }

  } catch (error) {
    console.error('Auto boost payment failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Auto boost payment failed'
    };
  }
}