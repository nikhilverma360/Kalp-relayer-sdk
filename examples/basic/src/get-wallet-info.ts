import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * Quick helper to get your wallet address and check token balance
 */
async function main() {
  const { RPC_URL, PRIVATE_KEY } = process.env;

  if (!RPC_URL || !PRIVATE_KEY) {
    console.error('Please set RPC_URL and PRIVATE_KEY in .env file');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  console.log('📍 Your Wallet Information:');
  console.log('=========================');
  console.log('Address:', address);
  console.log('');

  // Check ETH balance
  const ethBalance = await provider.getBalance(address);
  console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
  console.log('');

  // Check token balance
  const TOKEN_ADDRESS = '0x4D17116CF11cd4B8964280a1b178C2D9a2A0C51C';

  try {
    const tokenContract = new ethers.Contract(
      TOKEN_ADDRESS,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)',
      ],
      provider
    );

    const [name, symbol, decimals, balance] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.balanceOf(address),
    ]);

    console.log('Token:', name, `(${symbol})`);
    console.log('Token Balance:', ethers.formatUnits(balance, decimals), symbol);
    console.log('');

    if (balance === 0n) {
      console.log('⚠️  Warning: You have 0 tokens. You need tokens to test transfers!');
    } else {
      console.log('✅ You have tokens! Ready to test gasless transfers.');
    }
    console.log('');
    console.log('💡 Tip: You can use this address as RECIPIENT_ADDRESS to send tokens to yourself for testing.');
    console.log('');
  } catch (error) {
    console.error('Error checking token balance:', error);
  }
}

main().catch(console.error);
