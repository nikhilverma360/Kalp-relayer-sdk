# Custodial Ticket Claiming App

A simple ticket claiming application that demonstrates the use of Kalp's custodial wallet API. Users can claim tickets without needing MetaMask or gas fees.

## Features

- **No Wallet Required**: Users don't need MetaMask or any wallet
- **Gas-Free**: All transactions are handled by the custodial wallet
- **Real-time Updates**: Ticket count updates automatically
- **Simple UI**: Clean and intuitive interface

## How It Works

1. Enter your custodial wallet address (must be a valid Ethereum address)
2. The app fetches your current ticket count from the smart contract
3. Click "Claim Ticket" to increment your ticket count via the custodial wallet API
4. The API calls the smart contract's `increment()` function using your custodial address
5. Your ticket count updates automatically - no gas fees or wallet connection required!

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

## Smart Contract

- **Network**: Sepolia Testnet
- **Contract Address**: `0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c`

The contract has two main functions:
- `increment()`: Claims a ticket (increments the counter for the sender)
- `contextCounter(address)`: Returns the ticket count for a specific address

## API Integration

The app calls the Kalp custodial wallet API:

```
POST https://alpha-wallet-api.kalp.studio/relayer/write-transaction
```

With the following payload:
- Contract address and ABI
- Function name (`increment`)
- Custodial wallet address (user-provided)
- Chain ID (Sepolia: 11155111)

The API executes the transaction using the custodial wallet, so users don't need to have ETH for gas fees.

## Tech Stack

- React + TypeScript
- Vite
- ethers.js v6
- Kalp Custodial Wallet API

## License

MIT
