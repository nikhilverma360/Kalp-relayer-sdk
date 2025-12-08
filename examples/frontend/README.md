# Kalp Relayer Frontend Example

A React + TypeScript frontend application demonstrating gasless ERC20 token transfers using MetaMask and the Kalp Relayer SDK.

## Features

- 🦊 **MetaMask Integration** - Connect your MetaMask wallet
- 💸 **Gasless Transfers** - Send ERC20 tokens without paying gas fees
- 🔐 **EIP-2612 Permit** - Uses permit signatures for token approval
- ⚡ **Meta-Transactions** - Leverages ERC-2771 for gasless execution
- 📊 **Real-time Balance** - Display token balance and transaction status
- 🎨 **Modern UI** - Clean, responsive interface

## Prerequisites

1. **MetaMask** - [Install MetaMask](https://metamask.io/download/)
2. **Sepolia Testnet** - Add Sepolia network to MetaMask
3. **Test Tokens** - Get Sepolia test tokens (USDC or any EIP-2612 compatible token)
4. **Deployed Contracts:**
   - KalpRelayer contract
   - ERC20Facilitator contract

## Quick Start

### 1. Install Dependencies

```bash
# From the frontend directory
npm install
```

### 2. Configure Contract Addresses

Edit `src/App.tsx` and update the `CONFIG` object with your deployed contract addresses:

```typescript
const CONFIG = {
  chainId: 11155111, // Sepolia
  relayerAddress: '0xYOUR_RELAYER_ADDRESS',
  domainName: 'KalpRelayer',
  domainVersion: '1.0.0',
  sponsorAddress: '0xYOUR_SPONSOR_ADDRESS',
  relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  apiKey: 'YOUR_API_KEY',
  facilitatorAddress: '0xYOUR_FACILITATOR_ADDRESS',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  defaultTokenAddress: '0xYOUR_TOKEN_ADDRESS', // ERC20 with permit support
};
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## How to Use

### Step 1: Connect MetaMask

1. Click "Connect MetaMask" button
2. Approve the connection in MetaMask
3. Ensure you're on Sepolia network (the app will prompt to switch if needed)

### Step 2: Check Token Balance

- Your wallet address and token balance will be displayed
- The app uses the configured token address by default

### Step 3: Send Tokens (Gasless)

1. Enter the **recipient address**
2. Enter the **amount** to send
3. Click "Send Tokens (No Gas Required)"
4. **Sign two requests in MetaMask:**
   - First: EIP-2612 Permit signature (approves facilitator)
   - Second: Meta-transaction signature (authorizes relayer)
5. Wait for confirmation
6. View your transaction on Etherscan!

## How It Works

```
┌─────────────┐
│   User      │
│ (MetaMask)  │
└──────┬──────┘
       │
       │ 1. Sign EIP-2612 Permit
       │    (Approve Facilitator)
       │
       ▼
┌─────────────────────┐
│ ERC20Facilitator    │
│ Contract            │
└──────┬──────────────┘
       │
       │ 2. Sign Meta-Transaction
       │    (Authorize Relayer)
       │
       ▼
┌─────────────────────┐
│ Kalp Relayer        │
│ (Pays Gas)          │
└──────┬──────────────┘
       │
       │ 3. Execute Transfer
       │
       ▼
┌─────────────────────┐
│ ERC20 Token         │
│ (Transfer Complete) │
└─────────────────────┘
```

### Transaction Flow:

1. **User signs EIP-2612 permit** → Approves facilitator to spend tokens (no gas)
2. **User signs meta-transaction** → Authorizes relayer to execute (no gas)
3. **Relayer executes transaction** → Pays gas and calls facilitator
4. **Facilitator transfers tokens** → Uses permit to transfer tokens
5. **Tokens transferred** → Recipient receives tokens, sender paid zero gas!

## Supported Tokens

The token must implement **EIP-2612 permit** functionality:

✅ **Supported:**
- USDC
- DAI
- USDT (on some chains)
- Most modern ERC20 tokens

❌ **Not Supported:**
- Legacy ERC20 tokens without `permit()` function
- Non-ERC20 tokens

To check if a token supports permit:
```typescript
// Check for DOMAIN_SEPARATOR function
const hasPermit = await tokenContract.DOMAIN_SEPARATOR();
```

## Configuration

### Environment Variables (Optional)

You can externalize configuration by creating a `.env` file:

```bash
VITE_RELAYER_ADDRESS=0x...
VITE_FACILITATOR_ADDRESS=0x...
VITE_SPONSOR_ADDRESS=0x...
VITE_API_KEY=...
VITE_DEFAULT_TOKEN=0x...
```

Then update `src/App.tsx` to use environment variables:

```typescript
const CONFIG = {
  relayerAddress: import.meta.env.VITE_RELAYER_ADDRESS,
  // ...
};
```

### Network Configuration

To use a different network:

1. Update `chainId` in the CONFIG
2. Update the `rpcUrl` for that network
3. Deploy contracts to that network
4. Update contract addresses

## Troubleshooting

### MetaMask Not Detected

- Make sure MetaMask is installed
- Refresh the page
- Check browser console for errors

### Wrong Network

- The app will prompt you to switch to Sepolia
- Manually switch network in MetaMask if needed

### Transaction Failed

Common reasons:
- Insufficient token balance
- Token doesn't support EIP-2612 permit
- Incorrect contract addresses
- Network issues

### Signature Rejected

- User cancelled the signature request in MetaMask
- Try again and approve both signature requests

## Development

### Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # Application styles
├── main.tsx         # React entry point
└── index.css        # Global styles
```

### Key Components

**App.tsx** contains:
- Wallet connection logic
- Token information display
- Transfer form
- SDK integration
- Transaction handling

### Extending the App

To add new features:

1. **Multiple Tokens** - Add a token selector dropdown
2. **Transaction History** - Store and display past transactions
3. **Address Book** - Save frequent recipients
4. **Bulk Transfers** - Use `facilitateBulkTransferWithPermit`

## Security Notes

⚠️ **Important:**
- Never commit API keys or private keys to version control
- Always verify contract addresses before deployment
- Test on testnet before using on mainnet
- Users should verify transaction details before signing

## Learn More

- [Kalp Relayer SDK Documentation](../../README.md)
- [EIP-2612: Permit Extension for ERC-20](https://eips.ethereum.org/EIPS/eip-2612)
- [ERC-2771: Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [MetaMask Documentation](https://docs.metamask.io/)

## License

MIT
