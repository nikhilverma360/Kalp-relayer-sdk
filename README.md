# Kalp Relayer SDK

A universal TypeScript SDK for building gasless (meta) transactions using the Kalp Relay system. This SDK handles EIP-712 signing and meta-transaction relay for ERC-2771 compatible contracts.

> **🎉 Version 0.2.0:** Now supports **Ethers v6**! See [Migration Guide](./MIGRATION_TO_V6.md) if upgrading from v5.

## Features

- ✅ **Gasless Token Transfers** - Send ERC20 tokens without paying gas using EIP-2612 permit
- ✅ **Universal Wallet Support** - Works with any wallet via ethers.js v6
- ✅ **EIP-712 Typed Data Signing** - Secure, user-friendly transaction signing
- ✅ **Multiple Provider Support** - MetaMask, WalletConnect, Coinbase Wallet, and more
- ✅ **TypeScript First** - Full type safety and IntelliSense support
- ✅ **Monorepo Architecture** - Easy to extend with examples and integrations
- ✅ **Zero Gas Fees** - Users don't pay for transactions
- ✅ **Ethers v6** - Modern, faster, smaller bundle size

## Monorepo Structure

```
kalp-relayer-sdk/
├── sdk/                    # Core SDK package
│   ├── KalpRelaySDK.ts    # Main SDK class
│   ├── walletSigners.ts   # Wallet integration helpers
│   ├── types.ts           # TypeScript types
│   └── errors.ts          # Custom error classes
├── examples/
│   └── basic/             # Basic usage examples
│       └── src/
│           ├── index.ts                    # Node.js example (private key)
│           ├── metamask-example.ts         # Browser MetaMask example
│           ├── walletconnect-example.ts    # WalletConnect example
│           └── ethers-provider-example.ts  # Various ethers.js examples
└── package.json           # Root workspace configuration
```

## Installation

### Using the SDK in your project

```bash
npm install kalp-relayer-sdk ethers@^6.13.0
```

### Setting up the monorepo for development

```bash
# Clone the repository
git clone <repository-url>
cd kalp-relayer-sdk

# Install dependencies for all workspaces
npm install

# Build the SDK
npm run build

# Run the basic example
npm run dev:example
```

## Quick Start

### 1. Gasless ERC20 Token Transfer (Recommended)

The easiest way to send tokens without gas fees using EIP-2612 permit:

```typescript
import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const sdk = new KalpRelaySDK(
  {
    chainId: 11155111,
    relayerAddress: '0x...',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: '0x...',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
    apiKey: 'your-api-key',
    chains: {
      11155111: {
        chainId: 11155111,
        relayerAddress: '0x...',
        domainName: 'KalpRelay',
        domainVersion: '1',
        sponsorAddress: '0x...',
        rpcUrl: RPC_URL, // Required for token metadata
      },
    },
  },
  createEthersSigner(wallet)
);

// Send tokens without paying gas!
const result = await sdk.sendTokenTransfer({
  tokenAddress: '0x...', // ERC20 with permit support
  recipient: '0x...',
  amount: '1000000000000000000', // 1 token (18 decimals)
  userAddress: await wallet.getAddress(),
  facilitatorAddress: '0x...', // ERC20Facilitator contract
});

console.log('Transfer complete:', result.txHash);
```

### 2. With Ethers.js Wallet (Node.js/Backend)

```typescript
import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';

// Ethers v6 syntax
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const signerFn = createEthersSigner(wallet);

const sdk = new KalpRelaySDK(
  {
    chainId: 11155111, // Sepolia
    relayerAddress: '0x...',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: '0x...',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  },
  signerFn
);

const result = await sdk.executeRelay({
  target: '0xYourContract',
  data: sdk.encodeFunctionData('increment()', []),
  userAddress: await wallet.getAddress(),
});
```

### 2. With MetaMask (Browser)

```typescript
import { KalpRelaySDK, createMetaMaskSigner } from 'kalp-relayer-sdk';

const signerFn = createMetaMaskSigner();

const sdk = new KalpRelaySDK(config, signerFn);

// MetaMask will prompt user for signature
const result = await sdk.executeRelay({
  target: '0xYourContract',
  data: sdk.encodeFunctionData('transfer(address,uint256)', [recipient, amount]),
  userAddress: userAddress,
});
```

### 3. With WalletConnect / Any EIP-1193 Provider

```typescript
import { KalpRelaySDK, createEip1193Signer } from 'kalp-relayer-sdk';

// Works with WalletConnect, Coinbase Wallet, Frame, Rainbow, Safe, etc.
const signerFn = createEip1193Signer(provider);

const sdk = new KalpRelaySDK(config, signerFn);

const result = await sdk.executeRelay(relayParams);
```

## Wallet Integration Examples

The SDK provides three signer factory functions for different wallet types:

### `createEthersSigner(signer)`

For ethers.js v6 `Signer` instances (Wallet, JsonRpcSigner, BrowserProvider.getSigner()).

**Use cases:**
- Node.js scripts with private keys
- Browser apps using ethers.js BrowserProvider
- Backend services

```typescript
// Private key wallet (Ethers v6)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(privateKey, provider);
const signerFn = createEthersSigner(wallet);

// Browser wallet via BrowserProvider (Ethers v6)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signerFn = createEthersSigner(signer);
```

### `createMetaMaskSigner()`

For MetaMask browser extension (uses `eth_signTypedData_v4`).

**Use cases:**
- Web apps with MetaMask
- Browser-based dApps
- React/Vue/Svelte applications

```typescript
const signerFn = createMetaMaskSigner();
// MetaMask popup will appear for user approval
```

### `createEip1193Signer(provider)`

For any EIP-1193 compatible provider.

**Use cases:**
- WalletConnect
- Coinbase Wallet
- Frame
- Rainbow Kit
- Trust Wallet
- Safe App Provider
- Any custom wallet implementing EIP-1193

```typescript
// WalletConnect
const wcProvider = await EthereumProvider.init({...});
const signerFn = createEip1193Signer(wcProvider);

// Coinbase Wallet
const cbProvider = new CoinbaseWalletSDK({...}).makeWeb3Provider();
const signerFn = createEip1193Signer(cbProvider);

// Any EIP-1193 provider
const signerFn = createEip1193Signer(anyEIP1193Provider);
```

## SDK API Reference

### `KalpRelaySDK`

Main SDK class for executing gasless transactions.

#### Constructor

```typescript
new KalpRelaySDK(config: KalpRelayConfig, signTypedData: SignTypedDataFunction)
```

**Parameters:**
- `config.chainId` - Network chain ID (e.g., 11155111 for Sepolia)
- `config.relayerAddress` - Address of the Kalp Relayer contract
- `config.domainName` - EIP-712 domain name (default: "KalpRelay")
- `config.domainVersion` - EIP-712 domain version (default: "1")
- `config.sponsorAddress` - Address that sponsors gas fees
- `config.relayApiUrl` - Kalp Relay API endpoint

#### Methods

##### `executeRelay(params: RelayTransactionParams): Promise<RelayResult>`

Executes a gasless transaction through the Kalp Relayer.

**Parameters:**
- `params.target` - Target contract address
- `params.data` - Encoded function call data
- `params.userAddress` - User's wallet address
- `params.value` - Optional ETH value to send (default: 0)
- `params.deadline` - Optional Unix timestamp deadline (default: 1 hour from now)

**Returns:** Promise resolving to transaction result

##### `encodeFunctionData(signature: string, args: any[]): string`

Encodes a function call for use in relay transactions.

**Parameters:**
- `signature` - Function signature (e.g., "transfer(address,uint256)")
- `args` - Array of function arguments

**Returns:** Encoded function data as hex string

##### `sendTokenTransfer(params: TokenTransferParams, chainId?: number): Promise<RelayResult>`

Executes a gasless ERC20 token transfer using EIP-2612 permit and meta-transactions.

This high-level method abstracts all complexity by automatically:
1. Fetching token nonce and metadata from the blockchain
2. Generating an EIP-2612 permit signature
3. Encoding the call to ERC20Facilitator contract
4. Executing via KalpRelayer (gasless)

**Parameters:**
- `params.tokenAddress` - ERC20 token contract address (must support EIP-2612)
- `params.recipient` - Recipient wallet address
- `params.amount` - Amount to transfer (in token's smallest unit)
- `params.userAddress` - Sender's wallet address
- `params.facilitatorAddress` - ERC20Facilitator contract address
- `params.deadline` - Optional permit deadline (Unix timestamp, default: 1 hour)
- `chainId` - Optional chain ID (uses current chain if not provided)

**Returns:** Promise resolving to transaction result

**Requirements:**
- Token must support EIP-2612 permit (e.g., USDC, DAI, most modern ERC20s)
- ERC20Facilitator contract must be deployed
- Chain config must include `rpcUrl` for reading token metadata

**Example:**
```typescript
const result = await sdk.sendTokenTransfer({
  tokenAddress: '0x...',
  recipient: '0x...',
  amount: '1000000000000000000', // 1 token (18 decimals)
  userAddress: userAddress,
  facilitatorAddress: '0x...',
});
```

## Development

### Building the SDK

```bash
npm run build -w sdk
```

### Running Examples

```bash
# Set environment variables
export RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="0x..."
export RELAYER_ADDRESS="0x..."
export SPONSOR_ADDRESS="0x..."

# Run the example
npm run dev -w examples/basic
```

### Workspace Commands

```bash
# Build only the SDK
npm run build -w sdk

# Run example
npm run dev -w examples/basic

# Build from root
npm run build

# Lint
npm run lint
```

## Environment Variables

See `examples/basic/.env.example` for a complete list of environment variables:

```bash
# Required
RPC_URL=                # RPC endpoint (Infura, Alchemy, etc.)
PRIVATE_KEY=            # Private key for signing
RELAYER_ADDRESS=        # Kalp Relayer contract address
SPONSOR_ADDRESS=        # Gas sponsor address

# Optional
DOMAIN_NAME=KalpRelay   # EIP-712 domain name
DOMAIN_VERSION=1        # EIP-712 domain version
RELAY_API_URL=          # Kalp Relay API endpoint
TARGET_CONTRACT=        # Target contract for examples
```

## How It Works

1. **User initiates transaction** - Calls SDK's `executeRelay()` method
2. **EIP-712 signature** - User signs typed data (no gas required)
3. **Relay submission** - SDK sends signature + transaction to Kalp Relay API
4. **Gas sponsorship** - Relayer pays gas fees on behalf of user
5. **Transaction execution** - Transaction executed on-chain via ERC-2771

## Error Handling

The SDK provides custom error classes for better error handling:

```typescript
import {
  KalpRelayError,
  WalletNotConnectedError,
  SponsorFetchError,
  SignatureError,
  RelaySubmissionError,
} from 'kalp-relayer-sdk';

try {
  const result = await sdk.executeRelay(params);
} catch (error) {
  if (error instanceof SignatureError) {
    console.error('User rejected signature:', error.message);
  } else if (error instanceof RelaySubmissionError) {
    console.error('Relay failed:', error.message);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  KalpRelayConfig,
  RelayTransactionParams,
  RelayResult,
  SignTypedDataFunction,
  EIP712Message,
  EIP712Domain,
} from 'kalp-relayer-sdk';
```

## Gasless Token Transfers

The SDK provides a high-level `sendTokenTransfer()` method that enables gasless ERC20 token transfers using EIP-2612 permit signatures combined with meta-transactions.

### How It Works

1. **User signs EIP-2612 permit** - Approves the ERC20Facilitator to spend tokens (no gas)
2. **User signs meta-transaction** - Authorizes the relayer to execute the transfer (no gas)
3. **Relayer executes transaction** - Calls the facilitator which transfers tokens (relayer pays gas)
4. **Tokens transferred** - Recipient receives tokens, sender paid no gas

### Prerequisites

1. Deploy the `ERC20Facilitator` contract (`examples/basic/contracts/ERC20Facilator.sol`)
2. Deploy the `KalpRelayer` contract (`examples/basic/contracts/KalpRelayer.sol`)
3. Use an ERC20 token that supports EIP-2612 permit (USDC, DAI, etc.)
4. Configure SDK with RPC URL for token metadata fetching

### Usage

```typescript
// Initialize SDK with RPC URL
const sdk = new KalpRelaySDK(
  {
    chainId: 11155111,
    relayerAddress: RELAYER_ADDRESS,
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: SPONSOR_ADDRESS,
    relayApiUrl: RELAY_API_URL,
    apiKey: API_KEY,
    chains: {
      11155111: {
        chainId: 11155111,
        relayerAddress: RELAYER_ADDRESS,
        domainName: 'KalpRelay',
        domainVersion: '1',
        sponsorAddress: SPONSOR_ADDRESS,
        rpcUrl: RPC_URL, // Required for token metadata
      },
    },
  },
  signerFn
);

// Send tokens without paying gas
const result = await sdk.sendTokenTransfer({
  tokenAddress: TOKEN_ADDRESS,
  recipient: RECIPIENT_ADDRESS,
  amount: '1000000000000000000', // 1 token (18 decimals)
  userAddress: userAddress,
  facilitatorAddress: FACILITATOR_ADDRESS,
});

console.log('Transaction hash:', result.txHash);
```

### Supported Tokens

The token must implement EIP-2612 permit functionality:
- USDC
- DAI
- USDT (on some chains)
- Most modern ERC20 tokens

To check if a token supports permit, call:
```typescript
import { getTokenDomain } from 'kalp-relayer-sdk';

try {
  const domain = await getTokenDomain(tokenAddress, chainId, provider);
  console.log('Token supports permit:', domain.name);
} catch {
  console.log('Token does not support permit');
}
```

## Examples

See the `examples/basic/src/` directory for comprehensive examples:

- `index.ts` - Basic Node.js example with private key
- `token-transfer-example.ts` - **Gasless ERC20 token transfer (NEW!)**
- `metamask-example.ts` - Browser MetaMask integration
- `walletconnect-example.ts` - WalletConnect v2 integration
- `ethers-provider-example.ts` - Various ethers.js provider examples

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [Full docs link]
- Kalp Studio: https://kalp.studio
