/**
 * Type definitions for KalpRelaySDK
 */

/** Configuration for a single chain */
export interface ChainConfig {
  /** Chain ID for the network */
  chainId: number;
  /** Kalp Relayer contract address */
  relayerAddress: string;
  /** EIP-712 domain name */
  domainName: string;
  /** EIP-712 domain version */
  domainVersion: string;
  /** Fixed sponsor address for this chain */
  sponsorAddress: string;
  /** API endpoint for relay requests (optional, uses default if not provided) */
  relayApiUrl?: string;
  /** RPC URL for this chain (optional) */
  rpcUrl?: string;
  /** Chain name for display purposes */
  chainName?: string;
}

/** Main SDK configuration */
export interface KalpRelayConfig {
  /** Default chain configuration or single chain config */
  chainId: number;
  relayerAddress: string;
  domainName: string;
  domainVersion: string;
  /** Fixed sponsor address */
  sponsorAddress: string;
  relayApiUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Additional chain configurations for multi-chain support */
  chains?: Record<number, ChainConfig>;
  /** Retry configuration */
  retry?: {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelay?: number;
    /** Backoff multiplier (default: 2) */
    backoffMultiplier?: number;
  };
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface RelayTransactionParams {
  /** Target contract address */
  target: string;
  /** Encoded function call data */
  data: string;
  /** User's wallet address */
  userAddress: string;
}

export interface RelayResult {
  /** Transaction hash */
  txHash: string;
  /** Block number where transaction was mined */
  blockNumber?: number;
  /** Gas used by the transaction */
  gasUsed?: string;
  /** Success message */
  message: string;
}

export interface EIP712Message {
  target: string;
  data: string;
  user: string;
  sponsor: string;
  chainId: bigint;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

export type SignTypedDataFunction = (args: {
  domain?: {
    chainId?: number | bigint;
    name?: string;
    salt?: `0x${string}`;
    verifyingContract?: `0x${string}`;
    version?: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
  account?: `0x${string}`;
}) => Promise<string>;

/** ERC20 Token Transfer Parameters */
export interface TokenTransferParams {
  /** ERC20 token contract address */
  tokenAddress: string;
  /** Recipient address */
  recipient: string;
  /** Amount to transfer (in token's smallest unit, e.g., wei for 18 decimals) */
  amount: string | bigint;
  /** User's wallet address */
  userAddress: string;
  /** ERC20Facilitator contract address */
  facilitatorAddress: string;
  /** Optional deadline for permit signature (Unix timestamp, defaults to 1 hour from now) */
  deadline?: number;
}

/** EIP-2612 Permit Domain */
export interface EIP2612Domain {
  name: string;
  version?: string;
  chainId: number;
  verifyingContract: string;
}

/** EIP-2612 Permit Message */
export interface EIP2612PermitMessage {
  owner: string;
  spender: string;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}
