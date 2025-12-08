/**
 * Token Transfer utilities for gasless ERC20 transfers
 *
 * This module provides utilities for executing gasless token transfers
 * by combining EIP-2612 permit signatures with meta-transactions.
 */

import { ethers } from 'ethers';
import type {
  TokenTransferParams,
  EIP2612Domain,
  EIP2612PermitMessage,
  SignTypedDataFunction,
} from './types';

// Type alias for ethers provider
type EthersProvider = InstanceType<typeof ethers.JsonRpcProvider>;

/** EIP-2612 Permit type definition */
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * Minimal ERC20 ABI for permit functionality
 */
const ERC20_PERMIT_ABI = [
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)',
  'function version() view returns (string)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
];

/**
 * ERC20Facilitator ABI for encoding function calls
 */
const FACILITATOR_ABI = [
  'function facilitateTransferWithPermit(address token, address owner, address to, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
];

/**
 * Get the current nonce for a token holder
 *
 * @param tokenAddress - ERC20 token contract address
 * @param ownerAddress - Token owner's address
 * @param provider - Ethers provider or RPC URL
 * @returns Current nonce value
 */
export async function getTokenNonce(
  tokenAddress: string,
  ownerAddress: string,
  provider: EthersProvider | string
): Promise<bigint> {
  const ethersProvider = typeof provider === 'string'
    ? new ethers.JsonRpcProvider(provider)
    : provider;

  const tokenContract = new ethers.Contract(
    tokenAddress,
    ERC20_PERMIT_ABI,
    ethersProvider
  );

  try {
    const nonce = await tokenContract.nonces(ownerAddress);
    return BigInt(nonce.toString());
  } catch (error) {
    console.error('Failed to get token nonce:', error);
    throw new Error(`Failed to get nonce for token ${tokenAddress}: ${error}`);
  }
}

/**
 * Get token metadata for EIP-2612 domain
 *
 * @param tokenAddress - ERC20 token contract address
 * @param chainId - Chain ID
 * @param provider - Ethers provider or RPC URL
 * @returns EIP-2612 domain
 */
export async function getTokenDomain(
  tokenAddress: string,
  chainId: number,
  provider: EthersProvider | string
): Promise<EIP2612Domain> {
  const ethersProvider = typeof provider === 'string'
    ? new ethers.JsonRpcProvider(provider)
    : provider;

  const tokenContract = new ethers.Contract(
    tokenAddress,
    ERC20_PERMIT_ABI,
    ethersProvider
  );

  try {
    const name = await tokenContract.name();

    // Try to get version, default to "1" if not available
    let version = '1';
    try {
      version = await tokenContract.version();
    } catch {
      // Some tokens don't implement version(), use default
      console.log(`Token ${tokenAddress} doesn't implement version(), using default "1"`);
    }

    return {
      name,
      version,
      chainId,
      verifyingContract: tokenAddress,
    };
  } catch (error) {
    console.error('Failed to get token domain:', error);
    throw new Error(`Failed to get token metadata for ${tokenAddress}: ${error}`);
  }
}

/**
 * Sign an EIP-2612 permit message
 *
 * @param params - Permit parameters
 * @param signTypedData - Signing function
 * @returns Signature object with v, r, s components
 */
export async function signPermit(
  params: {
    tokenAddress: string;
    owner: string;
    spender: string;
    value: bigint;
    nonce: bigint;
    deadline: bigint;
    chainId: number;
    domain: EIP2612Domain;
  },
  signTypedData: SignTypedDataFunction
): Promise<{ v: number; r: string; s: string; signature: string }> {
  const domain = {
    name: params.domain.name,
    version: params.domain.version || '1',
    chainId: params.chainId,
    verifyingContract: params.tokenAddress as `0x${string}`,
  };

  const message: EIP2612PermitMessage = {
    owner: params.owner,
    spender: params.spender,
    value: params.value,
    nonce: params.nonce,
    deadline: params.deadline,
  };

  console.log('🔐 EIP-2612 Permit Signature Request:');
  console.log('Domain:', domain);
  console.log('Message:', {
    ...message,
    value: message.value.toString(),
    nonce: message.nonce.toString(),
    deadline: message.deadline.toString(),
  });

  try {
    const signature = await signTypedData({
      domain,
      types: PERMIT_TYPES,
      primaryType: 'Permit',
      message: message as any,
    });

    // Split signature into v, r, s components
    const sig = ethers.Signature.from(signature);

    return {
      v: sig.v,
      r: sig.r,
      s: sig.s,
      signature,
    };
  } catch (error) {
    console.error('Failed to sign permit:', error);
    throw new Error(`Permit signature failed: ${error}`);
  }
}

/**
 * Encode facilitateTransferWithPermit function call
 *
 * @param params - Token transfer parameters
 * @param permitSignature - EIP-2612 permit signature
 * @param deadline - Permit deadline
 * @returns Encoded function data
 */
export function encodeFacilitatorCall(
  params: {
    tokenAddress: string;
    owner: string;
    recipient: string;
    amount: bigint;
  },
  permitSignature: { v: number; r: string; s: string },
  deadline: bigint
): string {
  const facilitatorInterface = new ethers.Interface(FACILITATOR_ABI);

  const encodedData = facilitatorInterface.encodeFunctionData(
    'facilitateTransferWithPermit',
    [
      params.tokenAddress,
      params.owner,
      params.recipient,
      params.amount,
      deadline,
      permitSignature.v,
      permitSignature.r,
      permitSignature.s,
    ]
  );

  console.log('📝 Encoded facilitator call data:', encodedData);
  return encodedData;
}

/**
 * Calculate permit deadline (defaults to 1 hour from now)
 *
 * @param customDeadline - Optional custom deadline (Unix timestamp)
 * @returns Deadline as bigint
 */
export function calculateDeadline(customDeadline?: number): bigint {
  if (customDeadline) {
    return BigInt(customDeadline);
  }

  // Default: 1 hour from now
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const oneHourInSeconds = 60 * 60;
  return BigInt(nowInSeconds + oneHourInSeconds);
}
