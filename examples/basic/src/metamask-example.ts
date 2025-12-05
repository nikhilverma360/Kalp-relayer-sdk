/**
 * MetaMask Browser Example (Ethers v6)
 *
 * This example shows how to use the Kalp Relayer SDK with MetaMask in a browser environment.
 * Uses Ethers v6 with BrowserProvider.
 *
 * Usage:
 * 1. Import this in your React/Vue/vanilla JS app
 * 2. Call executeMetaMaskRelay() when user clicks a button
 */

import { KalpRelaySDK, createMetaMaskSigner } from 'kalp-relayer-sdk';

export async function executeMetaMaskRelay() {
  // Check if MetaMask is installed
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  // Configuration - in production, these would come from your app config
  const config = {
    chainId: 11155111, // Sepolia testnet
    relayerAddress: process.env.RELAYER_ADDRESS || '',
    domainName: 'KalpRelay',
    domainVersion: '1',
    sponsorAddress: process.env.SPONSOR_ADDRESS || '',
    relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  };

  // Create MetaMask signer
  const signerFn = createMetaMaskSigner();

  // Initialize SDK
  const sdk = new KalpRelaySDK(config, signerFn);

  // Request account access
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });

  const userAddress = accounts[0];

  // Example: Call increment() on a target contract
  const targetContract = '0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c';

  // Encode your function call (example with no parameters)
  const functionData = sdk.encodeFunctionData('increment()', []);

  const relayParams = {
    target: targetContract,
    data: functionData,
    userAddress,
  };

  console.log('🚀 Submitting gasless transaction via Kalp Relayer...');
  console.log('Transaction params:', relayParams);

  // Execute the relay - MetaMask will prompt for signature
  const result = await sdk.executeRelay(relayParams);

  console.log('✅ Transaction relayed successfully!');
  console.log('Result:', result);

  return result;
}

/**
 * React Component Example
 *
 * @example
 * ```tsx
 * import { executeMetaMaskRelay } from './metamask-example';
 *
 * function App() {
 *   const [loading, setLoading] = useState(false);
 *   const [result, setResult] = useState(null);
 *
 *   const handleSubmit = async () => {
 *     setLoading(true);
 *     try {
 *       const res = await executeMetaMaskRelay();
 *       setResult(res);
 *     } catch (error) {
 *       console.error('Error:', error);
 *       alert(error.message);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSubmit} disabled={loading}>
 *         {loading ? 'Processing...' : 'Execute Gasless Transaction'}
 *       </button>
 *       {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
 *     </div>
 *   );
 * }
 * ```
 */
