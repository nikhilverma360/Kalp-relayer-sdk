/**
 * Ethers.js Provider Example (Ethers v6)
 *
 * This example shows how to use the Kalp Relayer SDK with ethers.js v6 providers.
 * Works with:
 * - JsonRpcProvider (Infura, Alchemy, etc.)
 * - BrowserProvider (wraps window.ethereum or other EIP-1193 providers)
 * - Wallet (private key signing)
 */

import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';

/**
 * Example 1: Using a private key wallet (for backend/scripts)
 */
export async function executeWithPrivateKey() {
  const {
    RPC_URL,
    PRIVATE_KEY,
    RELAYER_ADDRESS,
    SPONSOR_ADDRESS,
  } = process.env;

  if (!RPC_URL || !PRIVATE_KEY || !RELAYER_ADDRESS || !SPONSOR_ADDRESS) {
    throw new Error('Missing required environment variables');
  }

  // Create provider and wallet (Ethers v6)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const userAddress = await wallet.getAddress();

  console.log('Using wallet address:', userAddress);

  // Create signer function from ethers wallet
  const signerFn = createEthersSigner(wallet);

  // Initialize SDK
  const config = {
    chainId: 11155111, // Sepolia
    relayerAddress: RELAYER_ADDRESS,
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: SPONSOR_ADDRESS,
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  };

  const sdk = new KalpRelaySDK(config, signerFn);

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

  console.log('✅ Success!');
  console.log('Result:', result);

  return result;
}

/**
 * Example 2: Using BrowserProvider (wraps browser wallet like MetaMask)
 */
export async function executeWithBrowserProvider() {
  if (!window.ethereum) {
    throw new Error('No browser wallet detected');
  }

  // Request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  // Create BrowserProvider from window.ethereum (Ethers v6)
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  console.log('Connected to:', userAddress);

  // Create signer function
  const signerFn = createEthersSigner(signer);

  // Initialize SDK
  const config = {
    chainId: 11155111, // Sepolia
    relayerAddress: process.env.RELAYER_ADDRESS || '',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: process.env.SPONSOR_ADDRESS || '',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  };

  const sdk = new KalpRelaySDK(config, signerFn);

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

/**
 * Example 3: With custom function calls
 */
export async function executeCustomFunction(
  functionSignature: string,
  args: any[],
  targetContract: string
) {
  if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
    throw new Error('Missing RPC_URL or PRIVATE_KEY');
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const signerFn = createEthersSigner(wallet);

  const config = {
    chainId: 11155111,
    relayerAddress: process.env.RELAYER_ADDRESS || '',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: process.env.SPONSOR_ADDRESS || '',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  };

  const sdk = new KalpRelaySDK(config, signerFn);

  // Encode custom function with parameters
  const functionData = sdk.encodeFunctionData(functionSignature, args);

  const relayParams = {
    target: targetContract,
    data: functionData,
    userAddress: await wallet.getAddress(),
  };

  console.log(`🚀 Calling ${functionSignature} on ${targetContract}...`);
  const result = await sdk.executeRelay(relayParams);

  console.log('✅ Success!', result);
  return result;
}

/**
 * Example usage of custom functions (Ethers v6):
 *
 * // Transfer tokens
 * await executeCustomFunction(
 *   'transfer(address,uint256)',
 *   ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', ethers.parseEther('10')],
 *   '0xYourTokenContract'
 * );
 *
 * // Set a value
 * await executeCustomFunction(
 *   'setValue(uint256)',
 *   [42],
 *   '0xYourContract'
 * );
 *
 * // Complex function with multiple parameters
 * await executeCustomFunction(
 *   'complexFunction(address,uint256,string,bool)',
 *   ['0x123...', 100, 'hello', true],
 *   '0xYourContract'
 * );
 */
