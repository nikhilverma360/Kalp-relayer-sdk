/**
 * WalletConnect Example
 *
 * This example shows how to use the Kalp Relayer SDK with WalletConnect v2.
 *
 * Installation required:
 * npm install @walletconnect/ethereum-provider
 *
 * Usage:
 * 1. Initialize WalletConnect with your project ID
 * 2. Connect to user's wallet
 * 3. Use createEip1193Signer to create a signer
 */

import { KalpRelaySDK, createEip1193Signer } from 'kalp-relayer-sdk';
// Uncomment when installing WalletConnect
// import { EthereumProvider } from '@walletconnect/ethereum-provider';

export async function executeWalletConnectRelay() {
  // Initialize WalletConnect provider
  // Note: You need to register your project at https://cloud.walletconnect.com
  const projectId = process.env.WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

  /* Uncomment when installing WalletConnect:
  const provider = await EthereumProvider.init({
    projectId,
    chains: [11155111], // Sepolia
    showQrModal: true,
    metadata: {
      name: 'Kalp Relayer Demo',
      description: 'Gasless transactions with Kalp Relayer',
      url: 'https://kalp.studio',
      icons: ['https://kalp.studio/icon.png']
    }
  });

  // Connect to wallet
  await provider.connect();

  // Get connected account
  const accounts = await provider.request({ method: 'eth_accounts' });
  const userAddress = accounts[0];

  console.log('Connected to WalletConnect with address:', userAddress);

  // Configuration
  const config = {
    chainId: 11155111, // Sepolia testnet
    relayerAddress: process.env.RELAYER_ADDRESS || '',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: process.env.SPONSOR_ADDRESS || '',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  };

  // Create EIP-1193 signer (WalletConnect implements this interface)
  const signerFn = createEip1193Signer(provider);

  // Initialize SDK
  const sdk = new KalpRelaySDK(config, signerFn);

  // Example: Call increment() on a target contract
  const targetContract = '0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c';

  const functionData = sdk.encodeFunctionData('increment()', []);

  const relayParams = {
    target: targetContract,
    data: functionData,
    userAddress,
  };

  console.log('🚀 Submitting gasless transaction via Kalp Relayer...');

  // Execute the relay - user's wallet will prompt for signature
  const result = await sdk.executeRelay(relayParams);

  console.log('✅ Transaction relayed successfully!');
  console.log('Result:', result);

  return result;
  */

  throw new Error(
    'WalletConnect is not installed. Run: npm install @walletconnect/ethereum-provider'
  );
}

/**
 * Generic EIP-1193 Provider Example
 *
 * The createEip1193Signer works with ANY provider that implements EIP-1193:
 * - WalletConnect
 * - Coinbase Wallet SDK
 * - Frame
 * - Rainbow Kit
 * - Safe App Provider
 * - Trust Wallet
 * - etc.
 */
export async function executeWithAnyEip1193Provider(provider: any) {
  // Ensure provider implements EIP-1193
  if (!provider || !provider.request) {
    throw new Error('Provider must implement EIP-1193 request method');
  }

  // Configuration
  const config = {
    chainId: 11155111, // Sepolia testnet
    relayerAddress: process.env.RELAYER_ADDRESS || '',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: process.env.SPONSOR_ADDRESS || '',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  };

  // Create signer from any EIP-1193 provider
  const signerFn = createEip1193Signer(provider);

  // Initialize SDK
  const sdk = new KalpRelaySDK(config, signerFn);

  // Get user address
  const accounts = await provider.request({ method: 'eth_accounts' });
  const userAddress = accounts[0];

  // Example transaction
  const targetContract = '0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c';
  const functionData = sdk.encodeFunctionData('increment()', []);

  const relayParams = {
    target: targetContract,
    data: functionData,
    userAddress,
  };

  console.log('🚀 Submitting gasless transaction...');
  const result = await sdk.executeRelay(relayParams);

  console.log('✅ Success!', result);
  return result;
}
