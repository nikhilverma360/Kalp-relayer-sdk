import { KalpRelaySDK, createEthersSigner, getTokenDomain } from 'kalp-relayer-sdk';
import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * Test script for gasless token transfer
 * Token: 0x4D17116CF11cd4B8964280a1b178C2D9a2A0C51C
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
    FACILITATOR_ADDRESS,
    RECIPIENT_ADDRESS,
  } = process.env;

  // Token address from user
  const TOKEN_ADDRESS = '0x4D17116CF11cd4B8964280a1b178C2D9a2A0C51C';

  // Validate required variables
  if (!RPC_URL) throw new Error('RPC_URL is required');
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is required');
  if (!RELAYER_ADDRESS) throw new Error('RELAYER_ADDRESS is required');
  if (!SPONSOR_ADDRESS) throw new Error('SPONSOR_ADDRESS is required');
  if (!API_KEY) throw new Error('API_KEY is required');
  if (!FACILITATOR_ADDRESS) throw new Error('FACILITATOR_ADDRESS is required');
  if (!RECIPIENT_ADDRESS) throw new Error('RECIPIENT_ADDRESS is required');

  console.log('🧪 Testing Gasless Token Transfer');
  console.log('=================================\n');

  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const userAddress = await wallet.getAddress();

  console.log('Configuration:');
  console.log('  User address:', userAddress);
  console.log('  Token:', TOKEN_ADDRESS);
  console.log('  Recipient:', RECIPIENT_ADDRESS);
  console.log('  Facilitator:', FACILITATOR_ADDRESS);
  console.log('  Relayer:', RELAYER_ADDRESS);
  console.log('');

  // Check token information
  console.log('📊 Checking token information...');
  try {
    const tokenContract = new ethers.Contract(
      TOKEN_ADDRESS,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)',
        'function DOMAIN_SEPARATOR() view returns (bytes32)',
      ],
      provider
    );

    const [name, symbol, decimals, balance] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.balanceOf(userAddress),
    ]);

    console.log('  Token name:', name);
    console.log('  Token symbol:', symbol);
    console.log('  Token decimals:', decimals);
    console.log('  Your balance:', ethers.formatUnits(balance, decimals), symbol);
    console.log('');

    // Check if token supports EIP-2612 permit
    console.log('🔍 Checking EIP-2612 permit support...');
    try {
      const domain = await getTokenDomain(TOKEN_ADDRESS, 11155111, provider);
      console.log('  ✅ Token supports EIP-2612 permit');
      console.log('  Domain name:', domain.name);
      console.log('  Domain version:', domain.version);
    } catch (error) {
      console.error('  ❌ Token does NOT support EIP-2612 permit');
      console.error('  This token cannot be used with gasless transfers');
      console.error('  Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
    console.log('');

    // Check balance
    if (balance === 0n) {
      console.error('❌ Error: Your balance is 0. Please acquire some tokens first.');
      process.exit(1);
    }

    // Determine amount to transfer (0.01 tokens or entire balance if less)
    const decimalsNum = Number(decimals);
    const oneToken = ethers.parseUnits('1', decimalsNum);
    const pointZeroOneToken = oneToken / 100n; // 0.01 tokens

    const amountToTransfer = balance < pointZeroOneToken ? balance : pointZeroOneToken;

    console.log('💸 Transfer details:');
    console.log('  Amount to transfer:', ethers.formatUnits(amountToTransfer, decimals), symbol);
    console.log('  Remaining balance:', ethers.formatUnits(balance - amountToTransfer, decimals), symbol);
    console.log('');

    // Initialize SDK
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
        chains: {
          11155111: {
            chainId: 11155111,
            relayerAddress: RELAYER_ADDRESS,
            domainName: DOMAIN_NAME,
            domainVersion: DOMAIN_VERSION,
            sponsorAddress: SPONSOR_ADDRESS,
            relayApiUrl: RELAY_API_URL,
            rpcUrl: RPC_URL,
            chainName: 'Sepolia',
          },
        },
      },
      signerFn
    );

    console.log('🚀 Executing gasless token transfer...');
    console.log('');

    // Execute the transfer
    const result = await sdk.sendTokenTransfer({
      tokenAddress: TOKEN_ADDRESS,
      recipient: RECIPIENT_ADDRESS,
      amount: amountToTransfer.toString(),
      userAddress: userAddress,
      facilitatorAddress: FACILITATOR_ADDRESS,
    });

    console.log('');
    console.log('✅ SUCCESS! Gasless token transfer completed!');
    console.log('===========================================');
    console.log('  Transaction hash:', result.txHash);
    if (result.blockNumber) {
      console.log('  Block number:', result.blockNumber);
    }
    if (result.gasUsed) {
      console.log('  Gas used:', result.gasUsed);
    }
    console.log('');
    console.log('🎉 You just transferred tokens WITHOUT paying any gas fees!');
    console.log('');

    // Provide explorer link (assuming Sepolia)
    console.log(`View transaction: https://sepolia.etherscan.io/tx/${result.txHash}`);

  } catch (error: any) {
    console.error('');
    console.error('❌ Error checking token or executing transfer:');
    console.error(error.message || error);

    if (error.code === 'CALL_EXCEPTION') {
      console.error('\nThis might mean:');
      console.error('  - The token address is invalid');
      console.error('  - The token contract is not deployed on this network');
      console.error('  - The RPC endpoint is not working correctly');
    }

    process.exit(1);
  }
}

// Run the test
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
