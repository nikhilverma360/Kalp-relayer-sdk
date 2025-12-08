# Frontend Quick Start Guide

Get your gasless token transfer frontend running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ MetaMask browser extension installed
- ✅ Sepolia testnet added to MetaMask
- ✅ KalpRelayer and ERC20Facilitator contracts deployed

## Step-by-Step Setup

### 1. Install Dependencies

From the repository root:

```bash
npm install
```

### 2. Configure Your Contracts

Edit `examples/frontend/src/App.tsx` and update the `CONFIG` object (lines 8-19):

```typescript
const CONFIG = {
  chainId: 11155111, // Sepolia
  relayerAddress: '0xYOUR_RELAYER_ADDRESS_HERE',
  facilitatorAddress: '0xYOUR_FACILITATOR_ADDRESS_HERE',
  sponsorAddress: '0xYOUR_SPONSOR_ADDRESS_HERE',
  apiKey: 'YOUR_API_KEY_HERE',
  // ... other config
};
```

**Your current addresses:**
- Relayer: `0xfC9aa13f0f1c436E20e0d970Ed076A054C563699`
- Facilitator: `0xC9404AfEB8b6A7D4b1d44C01eEC86f068D534248`
- Sponsor: `0xd22fb5ce742c5b293e34070d9f93a50590e7cc41`

### 3. Start the Development Server

From the repository root:

```bash
npm run dev:frontend
```

Or from the frontend directory:

```bash
cd examples/frontend
npm run dev
```

The app will open at **http://localhost:3000**

### 4. Use the Application

1. **Open http://localhost:3000** in your browser
2. **Click "Connect MetaMask"** and approve the connection
3. **Switch to Sepolia** network if prompted
4. **Fill in the transfer form:**
   - Token Address (pre-filled with USDC)
   - Recipient Address
   - Amount
5. **Click "Send Tokens"** and sign two requests:
   - First: Permit signature (approve facilitator)
   - Second: Meta-transaction signature (authorize relayer)
6. **Wait for confirmation** and view on Etherscan!

## Testing with Your Token

The app is pre-configured to use USDC (`0x4D17116CF11cd4B8964280a1b178C2D9a2A0C51C`).

To test with your own token:
1. Make sure it implements EIP-2612 `permit()`
2. Enter the token address in the "Token Address" field
3. The app will automatically load token info and your balance

## Common Issues

### "MetaMask is not installed"

- Install MetaMask: https://metamask.io/download/
- Refresh the page after installation

### "Please switch to Sepolia network"

- Click "Switch Network" when prompted
- Or manually switch in MetaMask

### "Transfer failed"

Check:
- You have enough tokens
- Token supports EIP-2612 permit
- Contract addresses are correct
- You're on Sepolia network

### Signature Rejected

- Make sure to approve BOTH signature requests in MetaMask
- First signature: Permit (approve facilitator)
- Second signature: Meta-transaction (authorize relayer)

## Production Build

To build for production:

```bash
npm run build:frontend
```

The production files will be in `examples/frontend/dist/`

Deploy to any static hosting:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## Next Steps

- Customize the UI in `src/App.css`
- Add more features (transaction history, address book, etc.)
- Deploy to production
- Test with different tokens

## Need Help?

- Check the full [README](./README.md)
- Review [SDK Documentation](../../README.md)
- Open an issue on GitHub

Happy coding! 🚀
