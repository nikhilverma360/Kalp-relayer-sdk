# Getting Started with Kalp Relayer SDK

This guide will walk you through setting up and using the Kalp Relayer SDK in your project.

## Table of Contents

1. [What is Kalp Relayer SDK?](#what-is-kalp-relayer-sdk)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Wallet Integration Guide](#wallet-integration-guide)
6. [Common Use Cases](#common-use-cases)
7. [Troubleshooting](#troubleshooting)

## What is Kalp Relayer SDK?

The Kalp Relayer SDK enables gasless transactions for your users. Instead of users paying gas fees, a sponsor pays on their behalf. Users only need to sign a message (EIP-712) - no ETH required!

**Benefits:**
- ✅ No gas fees for users
- ✅ Better UX (no wallet funding needed)
- ✅ Works with any wallet
- ✅ Compatible with ERC-2771 contracts

## Prerequisites

Before you start, you'll need:

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **A wallet** (MetaMask, WalletConnect, or private key)
4. **Kalp Relayer configuration**:
   - Relayer contract address
   - Sponsor address
   - Relay API endpoint

## Installation

### For Application Developers

Install the SDK in your project:

```bash
npm install kalp-relayer-sdk ethers@^5.7.2
```

### For SDK Development (Monorepo)

Clone and set up the monorepo:

```bash
git clone <repository-url>
cd kalp-relayer-sdk
npm install
npm run build
```

## Quick Start

### Step 1: Choose Your Wallet Integration

The SDK works with three types of wallet integrations:

| Wallet Type | Function | Use Case |
|-------------|----------|----------|
| **Ethers.js Signer** | `createEthersSigner(signer)` | Private keys, ethers.js wallets |
| **MetaMask** | `createMetaMaskSigner()` | Browser extension |
| **EIP-1193 Provider** | `createEip1193Signer(provider)` | WalletConnect, Coinbase, etc. |

### Step 2: Import the SDK

```typescript
import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';
```

### Step 3: Create Configuration

```typescript
const config = {
  chainId: 11155111,                    // Network (Sepolia)
  relayerAddress: '0x...',              // Relayer contract
  domainName: 'KalpRelay',              // EIP-712 domain
  domainVersion: '1',                   // EIP-712 version
  sponsorAddress: '0x...',              // Gas sponsor
  relayApiUrl: 'https://...',           // Relay endpoint
};
```

### Step 4: Initialize SDK

```typescript
// With ethers.js wallet
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const signerFn = createEthersSigner(wallet);

const sdk = new KalpRelaySDK(config, signerFn);
```

### Step 5: Execute a Transaction

```typescript
const result = await sdk.executeRelay({
  target: '0xYourContract',                         // Contract address
  data: sdk.encodeFunctionData('increment()', []),  // Function call
  userAddress: await wallet.getAddress(),           // User's address
});

console.log('Transaction hash:', result.transactionHash);
```

## Wallet Integration Guide

### Option 1: Private Key (Node.js/Backend)

**Best for:** Backend services, scripts, automation

```typescript
import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider(
  'https://sepolia.infura.io/v3/YOUR_KEY'
);
const wallet = new ethers.Wallet('0xYOUR_PRIVATE_KEY', provider);

const sdk = new KalpRelaySDK(config, createEthersSigner(wallet));
```

### Option 2: MetaMask (Browser)

**Best for:** Web dApps, React/Vue/Svelte apps

```typescript
import { KalpRelaySDK, createMetaMaskSigner } from 'kalp-relayer-sdk';

// Check MetaMask availability
if (!window.ethereum) {
  throw new Error('MetaMask not installed');
}

// Request account access
await window.ethereum.request({ method: 'eth_requestAccounts' });

// Create SDK
const sdk = new KalpRelaySDK(config, createMetaMaskSigner());
```

### Option 3: WalletConnect (Mobile + Desktop)

**Best for:** Multi-wallet support, mobile apps

```typescript
import { KalpRelaySDK, createEip1193Signer } from 'kalp-relayer-sdk';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

// Initialize WalletConnect
const provider = await EthereumProvider.init({
  projectId: 'YOUR_PROJECT_ID',
  chains: [11155111],
  showQrModal: true,
});

await provider.connect();

// Create SDK
const sdk = new KalpRelaySDK(config, createEip1193Signer(provider));
```

### Option 4: Web3Provider (Browser Wallets)

**Best for:** Any browser wallet via ethers.js

```typescript
import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const sdk = new KalpRelaySDK(config, createEthersSigner(signer));
```

## Common Use Cases

### Use Case 1: Token Transfer

```typescript
const data = sdk.encodeFunctionData(
  'transfer(address,uint256)',
  [
    '0xRecipientAddress',
    ethers.utils.parseEther('10') // 10 tokens
  ]
);

const result = await sdk.executeRelay({
  target: '0xTokenContract',
  data,
  userAddress: userAddress,
});
```

### Use Case 2: NFT Minting

```typescript
const data = sdk.encodeFunctionData(
  'mint(address,uint256)',
  [userAddress, tokenId]
);

const result = await sdk.executeRelay({
  target: '0xNFTContract',
  data,
  userAddress: userAddress,
});
```

### Use Case 3: Contract Interaction

```typescript
// Call any contract function
const data = sdk.encodeFunctionData(
  'updateProfile(string,string,uint256)',
  ['John Doe', 'john@example.com', 25]
);

const result = await sdk.executeRelay({
  target: '0xProfileContract',
  data,
  userAddress: userAddress,
});
```

### Use Case 4: Batch Operations

```typescript
// Execute multiple relay calls
const calls = [
  { target: contract1, data: data1, userAddress },
  { target: contract2, data: data2, userAddress },
  { target: contract3, data: data3, userAddress },
];

const results = await Promise.all(
  calls.map(params => sdk.executeRelay(params))
);
```

## React Integration Example

Here's a complete React component example:

```typescript
import { useState } from 'react';
import { KalpRelaySDK, createMetaMaskSigner } from 'kalp-relayer-sdk';

function GaslessTransaction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const config = {
    chainId: 11155111,
    relayerAddress: process.env.REACT_APP_RELAYER_ADDRESS,
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: process.env.REACT_APP_SPONSOR_ADDRESS,
    relayApiUrl: process.env.REACT_APP_RELAY_API_URL,
  };

  const executeTransaction = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check MetaMask
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      // Get user address
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      const userAddress = accounts[0];

      // Initialize SDK
      const sdk = new KalpRelaySDK(config, createMetaMaskSigner());

      // Execute relay
      const result = await sdk.executeRelay({
        target: process.env.REACT_APP_TARGET_CONTRACT,
        data: sdk.encodeFunctionData('increment()', []),
        userAddress,
      });

      setResult(result);
      console.log('Success!', result);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Gasless Transaction Demo</h2>

      <button onClick={executeTransaction} disabled={loading}>
        {loading ? 'Processing...' : 'Execute Transaction'}
      </button>

      {error && (
        <div style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div>
          <h3>Transaction Successful!</h3>
          <p>Hash: {result.transactionHash}</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Etherscan
          </a>
        </div>
      )}
    </div>
  );
}

export default GaslessTransaction;
```

## Troubleshooting

### "Cannot find module 'kalp-relayer-sdk'"

**Solution:** Build the SDK first if using the monorepo:
```bash
npm run build -w sdk
```

### "MetaMask is not installed"

**Solution:** Install MetaMask browser extension or use a different wallet integration.

### "User rejected signature"

**Solution:** This is normal user behavior. Handle it gracefully:
```typescript
try {
  const result = await sdk.executeRelay(params);
} catch (error) {
  if (error.message.includes('rejected')) {
    console.log('User cancelled the transaction');
  }
}
```

### "Invalid sponsor address"

**Solution:** Ensure your sponsor address is properly configured in the Kalp Relayer backend.

### Module resolution errors (ESM/CommonJS)

**Solution:** The SDK is built as CommonJS. Ensure your tsconfig.json has:
```json
{
  "compilerOptions": {
    "module": "CommonJS"
  }
}
```

### TypeScript errors with window.ethereum

**Solution:** Add type declarations (already included in examples):
```typescript
interface Window {
  ethereum?: {
    request: (args: any) => Promise<any>;
  };
}
```

## Next Steps

1. ✅ **Set up configuration** - Get your relayer and sponsor addresses
2. ✅ **Choose wallet integration** - Pick the right signer for your use case
3. ✅ **Test on testnet** - Use Sepolia for testing
4. ✅ **Deploy to production** - Switch to mainnet when ready
5. ✅ **Monitor transactions** - Track relay success rates

## Additional Resources

- [Full API Reference](./README.md)
- [Example Applications](./examples/basic/README.md)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-2771 Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)

## Support

Need help?
- Check the [examples folder](./examples/basic/) for working code
- Review the [main README](./README.md) for API details
- Open an issue on GitHub

---

Happy building with gasless transactions! 🚀
