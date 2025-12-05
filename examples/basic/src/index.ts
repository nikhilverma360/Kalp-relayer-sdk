import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * Sepolia test runner:
 *  - Signs with an ethers Wallet (private key) and submits via Kalp relayer
 *  - Configure via environment variables
 *  - Uses Ethers v6
 */
async function main() {
  const {
    RPC_URL,
    PRIVATE_KEY,
    RELAYER_ADDRESS,
    SPONSOR_ADDRESS,
    API_KEY,
    DOMAIN_NAME = 'KalpRelay',
    DOMAIN_VERSION = '1',
    RELAY_API_URL = 'https://alpha-wallet-api.kalp.studio/relayer/relay',
    TARGET_CONTRACT = '0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c',
  } = process.env;

  if (!RPC_URL) throw new Error('RPC_URL is required (e.g., Sepolia HTTPS endpoint)');
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is required for signing');
  if (!RELAYER_ADDRESS) throw new Error('RELAYER_ADDRESS (Kalp relayer contract) is required');
  if (!SPONSOR_ADDRESS) throw new Error('SPONSOR_ADDRESS is required');
  if (!API_KEY) throw new Error('API_KEY is required for relay authentication');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const userAddress = await wallet.getAddress();

  const signerFn = createEthersSigner(wallet);

  const sdk = new KalpRelaySDK(
    {
      chainId: 11155111, // Sepolia
      relayerAddress: RELAYER_ADDRESS,
      domainName: DOMAIN_NAME,
      domainVersion: DOMAIN_VERSION,
      sponsorAddress: SPONSOR_ADDRESS,
      relayApiUrl: RELAY_API_URL,
      apiKey: API_KEY,
    },
    signerFn
  );

  // Use ERC2771 format: append user address to function data
  const relayParams = {
    target: TARGET_CONTRACT,
    data: sdk.encodeERC2771CallData('increment()', [], userAddress),
    userAddress,
  };

  console.log('Submitting relay...', relayParams);
  const result = await sdk.executeRelay(relayParams);
  console.log('Relay result:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

