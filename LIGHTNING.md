# Bitcoin Lightning Integration via NWC

This app now supports Bitcoin Lightning payments through NWC (Nostr Wallet Connect) protocol.

## Features

- **Wallet Connection**: Connect any NWC-compatible Lightning wallet
- **Instant Payments**: Send Lightning payments instantly
- **Balance Display**: View your wallet balance in real-time
- **Multiple Payment Methods**:
  - Pay Lightning invoices
  - Keysend (direct payments without invoice)
  - Generate payment requests

## Setup

### For Users

1. Get a NWC-compatible wallet:
   - [Alby](https://getalby.com/)
   - [Mutiny Wallet](https://www.mutinywallet.com/)
   - Any wallet supporting NWC protocol

2. Get your NWC connection string from your wallet (looks like `nostr+walletconnect://...`)

3. Click the Lightning wallet button in the app header and paste your connection string

### For Developers

The integration includes:

- **NWC Service** (`lib/nwc-service.ts`): Core NWC protocol implementation
- **React Hook** (`hooks/useNWC.ts`): React integration for wallet management
- **UI Components**:
  - `components/LightningWallet.tsx`: Wallet connection and balance display
  - `components/LightningPayment.tsx`: Payment interface

## Usage Example

```tsx
import { LightningPayment } from '@/components/LightningPayment';

// Add Lightning payment button to any component
<LightningPayment
  recipientName="Podcast Name"
  recipientPubkey="lightning_address_or_pubkey"
  defaultAmount={1000}
  description="Support this podcast"
  onSuccess={(preimage) => console.log('Payment successful:', preimage)}
  onError={(error) => console.error('Payment failed:', error)}
/>
```

## NWC Protocol Details

NWC (Nostr Wallet Connect) is defined in [NIP-47](https://github.com/nostr-protocol/nips/blob/master/47.md).

### Supported Commands

- `get_info`: Get wallet information
- `get_balance`: Check wallet balance
- `pay_invoice`: Pay a Lightning invoice
- `make_invoice`: Create a payment request
- `pay_keysend`: Send direct payment without invoice
- `list_transactions`: View transaction history

### Security

- All communication is end-to-end encrypted using Nostr's NIP-04
- Connection strings should be kept private
- Wallet connections are stored in browser localStorage

## Testing

1. Use the Lightning payment buttons throughout the app
2. Connect a testnet wallet for testing
3. Use small amounts for initial testing

## Value4Value Integration

This Lightning integration enables Value4Value (V4V) payments for podcasts:

- Listeners can send tips while listening
- Support creators directly based on value received
- Enable premium content with Lightning payments
- Implement time-based splits for podcast segments

## Troubleshooting

### Connection Issues
- Ensure your wallet is online and NWC is enabled
- Check that the connection string is complete and valid
- Try disconnecting and reconnecting

### Payment Failures
- Verify sufficient balance in your wallet
- Check that the invoice hasn't expired
- Ensure the recipient's node is online

### Client-Side Error Fixed
If you encounter webpack module loading errors, the app now uses client-side only components with proper fallbacks to prevent SSR conflicts with nostr-tools.

## Future Enhancements

- [ ] Podcast RSS value tag integration
- [ ] Automated value splits
- [ ] Streaming payments (pay per minute)
- [ ] Lightning address support
- [ ] LNURL support
- [ ] WebLN fallback