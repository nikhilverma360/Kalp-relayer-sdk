import { KalpRelaySDK, createEthersSigner } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * Gasless ERC20 Token Transfer Example
 *
 * This example demonstrates how to send ERC20 tokens without paying gas fees
 * by using EIP-2612 permit signatures combined with the Kalp Relayer.
 *
 * Prerequisites:
 * 1. Deploy the ERC20Facilitator contract (examples/basic/contracts/ERC20Facilator.sol)
 * 2. Deploy the KalpRelayer contract (examples/basic/contracts/KalpRelayer.sol)
 * 3. Have an ERC20 token that supports EIP-2612 permit (e.g., USDC, DAI)
 * 4. Configure environment variables
 *
 * How it works:
 * 1. User signs an EIP-2612 permit allowing the facilitator to spend tokens
 * 2. User signs a meta-transaction to call the facilitator
 * 3. Relayer executes the transaction, paying for gas
 * 4. Tokens are transferred without user paying gas
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

    // Token transfer specific variables
    TOKEN_ADDRESS, // ERC20 token with permit support (e.g., USDC, DAI)
    FACILITATOR_ADDRESS, // ERC20Facilitator contract address
    RECIPIENT_ADDRESS, // Where to send the tokens
    TOKEN_AMOUNT, // Amount in smallest unit (e.g., wei for 18 decimals)
  } = process.env;

  // Validate required environment variables
  if (!RPC_URL) throw new Error('RPC_URL is required (e.g., Sepolia HTTPS endpoint)');
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is required for signing');
  if (!RELAYER_ADDRESS) throw new Error('RELAYER_ADDRESS (Kalp relayer contract) is required');
  if (!SPONSOR_ADDRESS) throw new Error('SPONSOR_ADDRESS is required');
  if (!API_KEY) throw new Error('API_KEY is required for relay authentication');
  if (!TOKEN_ADDRESS) throw new Error('TOKEN_ADDRESS (ERC20 with permit) is required');
  if (!FACILITATOR_ADDRESS) throw new Error('FACILITATOR_ADDRESS (ERC20Facilitator contract) is required');
  if (!RECIPIENT_ADDRESS) throw new Error('RECIPIENT_ADDRESS is required');
  if (!TOKEN_AMOUNT) throw new Error('TOKEN_AMOUNT is required');

  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const userAddress = await wallet.getAddress();

  console.log('🚀 Gasless Token Transfer Example');
  console.log('================================');
  console.log('User address:', userAddress);
  console.log('Token:', TOKEN_ADDRESS);
  console.log('Recipient:', RECIPIENT_ADDRESS);
  console.log('Amount:', TOKEN_AMOUNT);
  console.log('');

  // Create signing function
  const signerFn = createEthersSigner(wallet);

  // Initialize SDK with chain configuration including RPC URL
  const sdk = new KalpRelaySDK(
    {
      chainId: 11155111, // Sepolia testnet
      relayerAddress: RELAYER_ADDRESS,
      domainName: DOMAIN_NAME,
      domainVersion: DOMAIN_VERSION,
      sponsorAddress: SPONSOR_ADDRESS,
      relayApiUrl: RELAY_API_URL,
      apiKey: API_KEY,
      // Additional chain configurations can include RPC URLs
      chains: {
        11155111: {
          chainId: 11155111,
          relayerAddress: RELAYER_ADDRESS,
          domainName: DOMAIN_NAME,
          domainVersion: DOMAIN_VERSION,
          sponsorAddress: SPONSOR_ADDRESS,
          relayApiUrl: RELAY_API_URL,
          rpcUrl: RPC_URL, // RPC URL for reading token metadata
          chainName: 'Sepolia',
        },
      },
    },
    signerFn
  );

  try {
    // Execute gasless token transfer
    // This single method call handles:
    // 1. Fetching token nonce and metadata
    // 2. Signing EIP-2612 permit
    // 3. Encoding facilitator call
    // 4. Executing meta-transaction via relayer
    const result = await sdk.sendTokenTransfer({
      tokenAddress: TOKEN_ADDRESS,
      recipient: RECIPIENT_ADDRESS,
      amount: TOKEN_AMOUNT,
      userAddress: userAddress,
      facilitatorAddress: FACILITATOR_ADDRESS,
      // Optional: deadline (defaults to 1 hour from now)
      // deadline: Math.floor(Date.now() / 1000) + 3600,
    });

    console.log('');
    console.log('✅ Gasless token transfer successful!');
    console.log('Transaction hash:', result.txHash);
    console.log('Block number:', result.blockNumber);
    console.log('Gas used:', result.gasUsed);
    console.log('');
    console.log('🎉 Tokens transferred without paying gas fees!');
  } catch (error) {
    console.error('❌ Token transfer failed:', error);
    throw error;
  }
}

// Run the example
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
