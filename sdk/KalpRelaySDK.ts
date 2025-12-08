/**
 * KalpRelaySDK - Frontend SDK for gasless transactions via Kalp Relay
 *
 * This SDK handles EIP-712 signing and relay request submission for gasless transactions.
 * It abstracts the complexity of meta-transaction signing and relay interaction.
 *
 * Features:
 * - Multi-chain support with dynamic chain switching
 * - Sponsor address caching for improved performance
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * const sdk = new KalpRelaySDK(config, signTypedDataAsync);
 *
 * // Execute transaction on default chain
 * const result = await sdk.executeRelay({
 *   target: CONTRACT_ADDRESS,
 *   data: encodedFunctionData,
 *   userAddress: address,
 * });
 *
 * // Switch to different chain
 * await sdk.switchChain(137); // Polygon
 * ```
 */

import { ethers } from 'ethers';
import type {
  KalpRelayConfig,
  ChainConfig,
  RelayTransactionParams,
  RelayResult,
  SignTypedDataFunction,
  TokenTransferParams,
} from './types';

// Type alias for ethers provider
type EthersProvider = InstanceType<typeof ethers.JsonRpcProvider>;
import {
  WalletNotConnectedError,
  SignatureError,
  RelaySubmissionError,
  ChainNotSupportedError,
} from './errors';
import {
  retryWithBackoff,
  withTimeout,
  isValidAddress,
  isValidChainId,
  shouldRetryError,
} from './utils';
import {
  getTokenNonce,
  getTokenDomain,
  signPermit,
  encodeFacilitatorCall,
  calculateDeadline,
} from './tokenTransfer';

const RELAY_TYPE: Record<string, Array<{ name: string; type: string }>> = {
  RelayRequest: [
    { name: 'target', type: 'address' },
    { name: 'data', type: 'bytes' },
    { name: 'user', type: 'address' },
    { name: 'sponsor', type: 'address' },
    { name: 'chainId', type: 'uint256' },
  ],
};

/** Default configuration values */
const DEFAULTS = {
  RELAY_API_URL: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  MAX_RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  REQUEST_TIMEOUT: 30000, // 30 seconds
};

export class KalpRelaySDK {
  private config: KalpRelayConfig;
  private signTypedData: SignTypedDataFunction;
  private currentChainId: number;
  private chainConfigs: Map<number, ChainConfig>;
  private providers: Map<number, EthersProvider>;

  constructor(config: KalpRelayConfig, signTypedDataFn: SignTypedDataFunction) {
    // Validate required fields
    if (!isValidChainId(config.chainId)) {
      throw new Error('Invalid chain ID');
    }
    if (!isValidAddress(config.relayerAddress)) {
      throw new Error('Invalid relayer address');
    }
    if (!isValidAddress(config.sponsorAddress)) {
      throw new Error('Invalid sponsor address');
    }

    // Apply defaults
    this.config = {
      relayApiUrl: DEFAULTS.RELAY_API_URL,
      timeout: DEFAULTS.REQUEST_TIMEOUT,
      retry: {
        maxAttempts: DEFAULTS.MAX_RETRY_ATTEMPTS,
        initialDelay: DEFAULTS.INITIAL_RETRY_DELAY,
        backoffMultiplier: DEFAULTS.BACKOFF_MULTIPLIER,
        ...config.retry,
      },
      ...config,
    };

    this.signTypedData = signTypedDataFn;
    this.currentChainId = config.chainId;

    // Initialize chain configurations and providers
    this.chainConfigs = new Map();
    this.providers = new Map();

    // Add default chain config
    this.addChainConfig({
      chainId: config.chainId,
      relayerAddress: config.relayerAddress,
      domainName: config.domainName,
      domainVersion: config.domainVersion,
      sponsorAddress: config.sponsorAddress,
      relayApiUrl: config.relayApiUrl,
    });

    // Add additional chains if provided
    if (config.chains) {
      Object.values(config.chains).forEach((chainConfig) => {
        this.addChainConfig(chainConfig);
      });
    }

    console.log('✅ KalpRelaySDK initialized with chains:', Array.from(this.chainConfigs.keys()));
  }

  /**
   * Add a new chain configuration
   */
  addChainConfig(chainConfig: ChainConfig): void {
    if (!isValidChainId(chainConfig.chainId)) {
      throw new Error(`Invalid chain ID: ${chainConfig.chainId}`);
    }
    if (!isValidAddress(chainConfig.relayerAddress)) {
      throw new Error(`Invalid relayer address for chain ${chainConfig.chainId}`);
    }
    if (!isValidAddress(chainConfig.sponsorAddress)) {
      throw new Error(`Invalid sponsor address for chain ${chainConfig.chainId}`);
    }

    this.chainConfigs.set(chainConfig.chainId, chainConfig);

    // Create provider if RPC URL is provided
    if (chainConfig.rpcUrl) {
      this.providers.set(
        chainConfig.chainId,
        new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      );
    }

    console.log(`✅ Added chain configuration for chain ${chainConfig.chainId}`);
  }

  /**
   * Remove a chain configuration
   */
  removeChainConfig(chainId: number): void {
    if (chainId === this.currentChainId) {
      throw new Error('Cannot remove current chain configuration');
    }
    this.chainConfigs.delete(chainId);
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this.chainConfigs.has(chainId)) {
      throw new ChainNotSupportedError(chainId);
    }

    this.currentChainId = chainId;
    console.log(`🔄 Switched to chain ${chainId}`);
  }

  /**
   * Get current chain ID
   */
  getCurrentChain(): number {
    return this.currentChainId;
  }

  /**
   * Get configuration for a specific chain
   */
  getChainConfig(chainId?: number): ChainConfig {
    const targetChainId = chainId ?? this.currentChainId;
    const config = this.chainConfigs.get(targetChainId);

    if (!config) {
      throw new ChainNotSupportedError(targetChainId);
    }

    return config;
  }

  /**
   * Get list of supported chain IDs
   */
  getSupportedChains(): number[] {
    return Array.from(this.chainConfigs.keys());
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<KalpRelayConfig> {
    return { ...this.config };
  }

  /**
   * Update SDK configuration
   */
  updateConfig(partialConfig: Partial<KalpRelayConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Create and sign an EIP-712 relay request
   * @private
   */
  private async signRelayRequest(
    params: RelayTransactionParams,
    sponsorAddress: string,
    chainId?: number
  ): Promise<string> {
    if (!params.userAddress) {
      throw new WalletNotConnectedError();
    }

    // Validate addresses
    if (!isValidAddress(params.target)) {
      throw new Error('Invalid target contract address');
    }
    if (!isValidAddress(params.userAddress)) {
      throw new Error('Invalid user address');
    }
    if (!isValidAddress(sponsorAddress)) {
      throw new Error('Invalid sponsor address');
    }

    const targetChainId = chainId ?? this.currentChainId;
    const chainConfig = this.getChainConfig(targetChainId);

    try {
      const domain = {
        name: chainConfig.domainName,
        version: chainConfig.domainVersion,
        chainId: targetChainId,
        verifyingContract: chainConfig.relayerAddress as `0x${string}`,
      };

      const message = {
        target: params.target,
        data: params.data,
        user: params.userAddress,
        sponsor: sponsorAddress,
        chainId: BigInt(targetChainId),
      };

      console.log('🔐 EIP-712 Signature Request:');
      console.log('Domain:', domain);
      console.log('Types:', RELAY_TYPE);
      console.log('Message:', {
        ...message,
        chainId: message.chainId.toString(),
      });

      const signature = await withTimeout(
        this.signTypedData({
          domain,
          types: RELAY_TYPE,
          primaryType: 'RelayRequest',
          message,
        }),
        this.config.timeout!
      );

      return signature;
    } catch (error) {
      console.error('❌ Sign relay request failed:', error);
      if (error instanceof Error) {
        throw new SignatureError(error.message);
      }
      throw new SignatureError(error);
    }
  }

  /**
   * Submit signed relay request to the backend
   * @private
   */
  private async submitRelayRequest(
    params: RelayTransactionParams,
    signature: string,
    sponsorAddress: string,
    chainId?: number
  ): Promise<RelayResult> {
    const targetChainId = chainId ?? this.currentChainId;
    const chainConfig = this.getChainConfig(targetChainId);
    const relayApiUrl = chainConfig.relayApiUrl || this.config.relayApiUrl!;

    const submitFn = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add API key if configured
        if (this.config.apiKey) {
          headers['apiKey'] = this.config.apiKey;
        }

        const requestPayload = {
          chainId: targetChainId,
          contractAddress: params.target,
          userAddress: params.userAddress,
          data: params.data,
          userSignature: signature,
          sponsor: sponsorAddress,
        };

        console.log('📤 Submitting relay request:', requestPayload);

        const response = await fetch(relayApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestPayload),
        });

        console.log('📥 Relay response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Relay error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Relay success response:', data);

        if (data.message !== 'success') {
          throw new Error(data.error || data.message || 'Transaction failed');
        }

        // Handle both response formats: direct fields or nested in result
        const result = data.result || data;

        return {
          txHash: result.txHash || data.txHash,
          blockNumber: result.blockNumber || data.blockNumber,
          gasUsed: result.gasUsed || data.gasUsed,
          message: data.message,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown relay error';
        throw new RelaySubmissionError(message, error);
      }
    };

    try {
      // Submit with retry and timeout
      return await withTimeout(
        retryWithBackoff(submitFn, {
          maxAttempts: this.config.retry!.maxAttempts,
          initialDelay: this.config.retry!.initialDelay,
          backoffMultiplier: this.config.retry!.backoffMultiplier,
          shouldRetry: shouldRetryError,
        }),
        this.config.timeout!
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a gasless relay transaction
   *
   * This is the main method to send a meta-transaction via the Kalp Relay.
   * It handles sponsor fetching, EIP-712 signing, and relay submission.
   *
   * @param params - Transaction parameters
   * @param chainId - Optional chain ID (uses current chain if not provided)
   * @returns Promise with transaction result
   *
   * @example
   * ```typescript
   * const result = await sdk.executeRelay({
   *   target: '0x...',
   *   data: encodedData,
   *   userAddress: '0x...',
   * });
   * console.log('Transaction hash:', result.txHash);
   * ```
   */
  async executeRelay(
    params: RelayTransactionParams,
    chainId?: number
  ): Promise<RelayResult> {
    const targetChainId = chainId ?? this.currentChainId;

    console.log(`🚀 Executing relay transaction on chain ${targetChainId}`);

    // Step 1: Get sponsor address from chain config
    const chainConfig = this.getChainConfig(targetChainId);
    const sponsorAddress = chainConfig.sponsorAddress;

    console.log(`💰 Using sponsor address: ${sponsorAddress}`);

    // Step 2: Sign the relay request with EIP-712
    const signature = await this.signRelayRequest(params, sponsorAddress, targetChainId);

    // Log signed transaction data
    console.log({
      chainId: targetChainId,
      contractAddress: params.target,
      userAddress: params.userAddress,
      data: params.data,
      userSignature: signature,
    });

    // Step 3: Submit to relay backend
    const result = await this.submitRelayRequest(
      params,
      signature,
      sponsorAddress,
      targetChainId
    );

    return result;
  }

  /**
   * Helper: Encode function call data with ERC-2771 format
   *
   * Appends the user's address to the encoded function data for ERC-2771 compatibility.
   *
   * @param functionSignature - Function signature (e.g., "increment()")
   * @param args - Function arguments
   * @param userAddress - User's wallet address
   * @returns Encoded call data with appended user address
   *
   * @example
   * ```typescript
   * const callData = sdk.encodeERC2771CallData(
   *   'transfer(address,uint256)',
   *   [recipient, amount],
   *   userAddress
   * );
   * ```
   */
  encodeERC2771CallData(
    functionSignature: string,
    args: unknown[] = [],
    userAddress: string
  ): string {
    const functionInterface = new ethers.Interface([`function ${functionSignature}`]);
    const baseCallData = functionInterface.encodeFunctionData(
      functionSignature.split('(')[0],
      args
    );

    // Append user address for ERC-2771 format
    return ethers.hexlify(ethers.concat([baseCallData, userAddress]));
  }

  /**
   * Helper: Encode simple function call data (without ERC-2771)
   *
   * @param functionSignature - Function signature (e.g., "increment()")
   * @param args - Function arguments
   * @returns Encoded call data
   */
  encodeFunctionData(functionSignature: string, args: unknown[] = []): string {
    const functionInterface = new ethers.Interface([`function ${functionSignature}`]);
    return functionInterface.encodeFunctionData(
      functionSignature.split('(')[0],
      args
    );
  }

  /**
   * Set or get provider for a specific chain
   *
   * @param chainId - Chain ID
   * @param provider - Optional provider to set (if not provided, returns existing provider)
   * @returns Provider for the chain
   */
  setProvider(chainId: number, provider: EthersProvider): void {
    this.providers.set(chainId, provider);
  }

  /**
   * Get provider for a specific chain
   *
   * @param chainId - Chain ID (optional, defaults to current chain)
   * @returns Provider for the chain
   * @throws Error if provider is not configured
   */
  getProvider(chainId?: number): EthersProvider {
    const targetChainId = chainId ?? this.currentChainId;
    const provider = this.providers.get(targetChainId);

    if (!provider) {
      throw new Error(
        `No provider configured for chain ${targetChainId}. ` +
        `Please set an RPC URL in chain config or call setProvider().`
      );
    }

    return provider;
  }

  /**
   * Execute a gasless ERC20 token transfer using EIP-2612 permit and KalpRelayer
   *
   * This high-level method abstracts the complexity of gasless token transfers by:
   * 1. Fetching the token's nonce for the user
   * 2. Generating an EIP-2612 permit signature
   * 3. Encoding a call to the ERC20Facilitator contract
   * 4. Executing the transaction via the KalpRelayer (gasless)
   *
   * @param params - Token transfer parameters
   * @param chainId - Optional chain ID (uses current chain if not provided)
   * @returns Promise with transaction result
   *
   * @example
   * ```typescript
   * const result = await sdk.sendTokenTransfer({
   *   tokenAddress: '0x...', // ERC20 token with permit support
   *   recipient: '0x...',
   *   amount: '1000000000000000000', // 1 token (18 decimals)
   *   userAddress: '0x...',
   *   facilitatorAddress: '0x...', // ERC20Facilitator contract
   *   deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
   * });
   * console.log('Transfer hash:', result.txHash);
   * ```
   */
  async sendTokenTransfer(
    params: TokenTransferParams,
    chainId?: number
  ): Promise<RelayResult> {
    const targetChainId = chainId ?? this.currentChainId;

    console.log(`💸 Initiating gasless token transfer on chain ${targetChainId}`);

    // Validate addresses
    if (!isValidAddress(params.tokenAddress)) {
      throw new Error('Invalid token address');
    }
    if (!isValidAddress(params.recipient)) {
      throw new Error('Invalid recipient address');
    }
    if (!isValidAddress(params.userAddress)) {
      throw new Error('Invalid user address');
    }
    if (!isValidAddress(params.facilitatorAddress)) {
      throw new Error('Invalid facilitator address');
    }

    // Convert amount to BigInt
    const amount = typeof params.amount === 'string'
      ? BigInt(params.amount)
      : params.amount;

    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    // Get provider for the chain
    const provider = this.getProvider(targetChainId);

    console.log('📊 Token transfer details:');
    console.log('  Token:', params.tokenAddress);
    console.log('  From:', params.userAddress);
    console.log('  To:', params.recipient);
    console.log('  Amount:', amount.toString());

    // Step 1: Get token metadata and nonce
    console.log('🔍 Fetching token metadata and nonce...');
    const [domain, nonce] = await Promise.all([
      getTokenDomain(params.tokenAddress, targetChainId, provider),
      getTokenNonce(params.tokenAddress, params.userAddress, provider),
    ]);

    console.log(`  Token name: ${domain.name}`);
    console.log(`  Current nonce: ${nonce}`);

    // Step 2: Calculate deadline
    const deadline = calculateDeadline(params.deadline);
    console.log(`  Permit deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);

    // Step 3: Sign EIP-2612 permit
    console.log('🔐 Requesting EIP-2612 permit signature...');
    const permitSignature = await signPermit(
      {
        tokenAddress: params.tokenAddress,
        owner: params.userAddress,
        spender: params.facilitatorAddress,
        value: amount,
        nonce,
        deadline,
        chainId: targetChainId,
        domain,
      },
      this.signTypedData
    );

    console.log('✅ Permit signature obtained');

    // Step 4: Encode facilitator call
    const facilitatorCallData = encodeFacilitatorCall(
      {
        tokenAddress: params.tokenAddress,
        owner: params.userAddress,
        recipient: params.recipient,
        amount,
      },
      permitSignature,
      deadline
    );

    // Step 5: Execute relay transaction
    console.log('🚀 Executing gasless relay transaction...');
    const result = await this.executeRelay(
      {
        target: params.facilitatorAddress,
        data: facilitatorCallData,
        userAddress: params.userAddress,
      },
      targetChainId
    );

    console.log('✅ Gasless token transfer complete!');
    console.log(`  Transaction hash: ${result.txHash}`);

    return result;
  }
}
