# Kalp Relayer SDK - Basic Examples

Comprehensive examples showing how to integrate the Kalp Relayer SDK with different wallet providers and environments.

## Examples Included

### 1. **Node.js with Private Key** (`src/index.ts`)
Basic example using ethers.js Wallet with a private key.

**Use case:** Backend services, scripts, automated testing

```bash
npm run dev
```

### 2. **MetaMask Browser Integration** (`src/metamask-example.ts`)
Browser-based example using MetaMask extension.

**Use case:** Web dApps, React/Vue/Svelte apps

### 3. **WalletConnect** (`src/walletconnect-example.ts`)
WalletConnect v2 integration for mobile wallet support.

**Use case:** Mobile-friendly dApps, multi-wallet support

### 4. **Ethers.js Providers** (`src/ethers-provider-example.ts`)
Various ethers.js provider examples including Web3Provider, JsonRpcProvider, and custom functions.

**Use case:** Any ethers.js compatible wallet

## Quick Setup

### 1. Install Dependencies

From the monorepo root:
```bash
npm install
npm run build
```

### 2. Configure Environment

A `.env` file has been created for you. Edit it with your actual values:

```bash
# Edit .env file in examples/basic/.env
nano .env
# or
code .env
```

You need to provide:
```bash
# Required
RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
PRIVATE_KEY="0x..."
RELAYER_ADDRESS="0x..."
SPONSOR_ADDRESS="0x..."

# Optional
TARGET_CONTRACT="0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c"
DOMAIN_NAME="KalpRelay"
DOMAIN_VERSION="1"
RELAY_API_URL="https://alpha-wallet-api.kalp.studio/relayer/relay"
```

### 3. Run Examples

Run the default Node.js example:
```bash
npm run dev -w examples/basic
```

Or from the monorepo root:
```bash
npm run dev:example
```

## Example Walkthroughs

### Ethers.js Wallet (Private Key)

```typescript
import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';

// Setup provider and wallet (Ethers v6)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Create signer function
const signerFn = createEthersSigner(wallet);

// Initialize SDK
const sdk = new KalpRelaySDK({
  chainId: 11155111,
  relayerAddress: RELAYER_ADDRESS,
  domainName: 'KalpRelay',
  domainVersion: '1',
  sponsorAddress: SPONSOR_ADDRESS,
  relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
}, signerFn);

// Execute gasless transaction
const result = await sdk.executeRelay({
  target: TARGET_CONTRACT,
  data: sdk.encodeFunctionData('increment()', []),
  userAddress: await wallet.getAddress(),
});
```

### MetaMask (Browser)

```typescript
import { KalpRelaySDK, createMetaMaskSigner } from 'kalp-relayer-sdk';

// Create MetaMask signer (no parameters needed)
const signerFn = createMetaMaskSigner();

// Initialize SDK
const sdk = new KalpRelaySDK(config, signerFn);

// Get user address
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});

// Execute - MetaMask will prompt for signature
const result = await sdk.executeRelay({
  target: contractAddress,
  data: sdk.encodeFunctionData('transfer(address,uint256)', [to, amount]),
  userAddress: accounts[0],
});
```

### WalletConnect

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

// Create signer
const signerFn = createEip1193Signer(provider);

// Initialize SDK and execute
const sdk = new KalpRelaySDK(config, signerFn);
const result = await sdk.executeRelay(params);
```

## Custom Function Calls

### Simple Function (No Parameters)

```typescript
const data = sdk.encodeFunctionData('increment()', []);
```

### Function with Parameters

```typescript
// Transfer tokens (Ethers v6)
const data = sdk.encodeFunctionData(
  'transfer(address,uint256)',
  ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', ethers.parseEther('10')]
);

// Set a value
const data = sdk.encodeFunctionData(
  'setValue(uint256)',
  [42]
);

// Complex function
const data = sdk.encodeFunctionData(
  'complexFunction(address,uint256,string,bool)',
  ['0x123...', 100, 'hello', true]
);
```

## Network Configuration

### Sepolia Testnet (Default)

```typescript
{
  chainId: 11155111,
  // ... other config
}
```

### Other Networks

Change the `chainId` in your configuration:

- **Ethereum Mainnet:** `1`
- **Polygon:** `137`
- **Mumbai Testnet:** `80001`
- **Arbitrum:** `42161`

Make sure your RPC_URL matches the network!

## Troubleshooting

### "MetaMask is not installed"

Make sure you're running in a browser with MetaMask installed. For development, you can use a browser extension or test in Chrome/Firefox.

### "Module not found: kalp-relayer-sdk"

Build the SDK first:
```bash
npm run build -w sdk
```

Then reinstall example dependencies:
```bash
npm install -w examples/basic
```

### "User rejected signature"

This is normal - the user declined to sign the transaction. Handle it gracefully in your UI.

### "Cannot find module 'KalpRelaySDK'"

This error means the SDK wasn't compiled to CommonJS properly. Ensure `tsconfig.base.json` has:
```json
{
  "compilerOptions": {
    "module": "CommonJS"
  }
}
```

Then rebuild:
```bash
npm run build
```

## Testing Without Real Funds

1. Get Sepolia ETH from a faucet (not needed for the user, but the relayer/sponsor needs it)
2. Deploy a test contract or use the example contract: `0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c`
3. Configure your relayer and sponsor addresses
4. Test gasless transactions!

## Next Steps

- Integrate into your React/Vue app
- Add custom contract interactions
- Deploy your own ERC-2771 compatible contracts
- Set up your own relayer infrastructure

## Resources

- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-2771 Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [Ethers.js Documentation](https://docs.ethers.org/v5/)
- [WalletConnect Documentation](https://docs.walletconnect.com/)

## Support

For issues or questions, please refer to the main repository README or open an issue.

