/**
 * Wallet signer helpers for KalpRelaySDK
 *
 * These factory functions create signing implementations for different wallet providers.
 * This keeps the SDK wallet-agnostic while providing convenient helpers.
 */

import { ethers } from 'ethers';
import type { SignTypedDataFunction } from './types';

/**
 * Prepare values for EIP-712 signing
 * Converts BigInt to hex strings and recursively processes objects
 */
const prepareValue = (value: any): any => {
  if (typeof value === 'bigint') {
    return '0x' + value.toString(16);
  }
  if (typeof value === 'object' && value !== null) {
    const result: any = {};
    for (const key in value) {
      result[key] = prepareValue(value[key]);
    }
    return result;
  }
  return value;
};

/**
 * Create a MetaMask-compatible EIP-712 signer
 *
 * @returns SignTypedDataFunction compatible with eth_signTypedData_v4
 * @throws Error if MetaMask is not installed
 *
 * @example
 * ```typescript
 * const signer = createMetaMaskSigner();
 * const sdk = new KalpRelaySDK(config, signer);
 * ```
 */
export const createMetaMaskSigner = (): SignTypedDataFunction => {
  return async (args: any) => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    // Request accounts first to ensure MetaMask is connected
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // EIP-712 requires EIP712Domain type to be included
    const types = {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      ...args.types,
    };

    const typedData = {
      domain: {
        name: args.domain.name,
        version: args.domain.version,
        chainId: args.domain.chainId,
        verifyingContract: args.domain.verifyingContract,
      },
      types,
      primaryType: args.primaryType,
      message: prepareValue(args.message),
    };

    console.log('📝 Requesting signature from address:', address);
    console.log('📝 Typed data:', JSON.stringify(typedData, null, 2));

    try {
      // Use eth_signTypedData_v4 for EIP-712 signing
      const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)],
      });

      console.log('✅ Signature obtained successfully');
      return signature as string;
    } catch (error: any) {
      console.error('❌ Signature error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);

      // Provide better error messages
      if (error.code === 4001) {
        throw new Error('User rejected the signature request');
      }
      if (error.code === -32603) {
        throw new Error('Internal JSON-RPC error: ' + (error.message || 'Unknown error'));
      }
      throw new Error(error.message || 'Failed to sign typed data');
    }
  };
};

/**
 * Create an Ethers.js Signer-compatible EIP-712 signer
 *
 * @param signer - Ethers.js Signer instance (v6)
 * @returns SignTypedDataFunction using ethers signTypedData
 *
 * @example
 * ```typescript
 * // Ethers v6
 * const provider = new ethers.BrowserProvider(window.ethereum);
 * const signer = await provider.getSigner();
 * const signerFn = createEthersSigner(signer);
 * const sdk = new KalpRelaySDK(config, signerFn);
 * ```
 */
export const createEthersSigner = (signer: any): SignTypedDataFunction => {
  return async (args: any) => {
    // Ethers v6 uses signTypedData (no underscore)
    if (!signer.signTypedData) {
      throw new Error('Signer does not support signTypedData');
    }

    const signature = await signer.signTypedData(
      args.domain,
      args.types,
      args.message
    );

    return signature;
  };
};

/**
 * Create a generic EIP-1193 signer (WalletConnect, Coinbase, Frame, Rainbow, Safe, etc.)
 *
+ * @param provider - EIP-1193 provider with request method
 * @returns SignTypedDataFunction using eth_signTypedData_v4
 * @example
 * ```typescript
 * const wc = await WalletConnectProvider.init({ projectId, chains: [137] });
 * await wc.connect();
 * const signer = createEip1193Signer(wc);
 * const sdk = new KalpRelaySDK(config, signer);
 * ```
 */
export const createEip1193Signer = (provider: {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
}): SignTypedDataFunction => {
  return async (args: any) => {
    if (!provider?.request) {
      throw new Error('Provider does not implement request');
    }

    // Ensure we have an account
    const accounts =
      (await provider.request({ method: 'eth_requestAccounts' })) ??
      (await provider.request({ method: 'eth_accounts' }));

    const address = accounts?.[0];
    if (!address) {
      throw new Error('No account available from provider');
    }

    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        ...args.types,
      },
      domain: {
        name: args.domain.name,
        version: args.domain.version,
        chainId: Number(args.domain.chainId),
        verifyingContract: args.domain.verifyingContract,
      },
      primaryType: args.primaryType,
      message: prepareValue(args.message),
    };

    return provider.request({
      method: 'eth_signTypedData_v4',
      params: [address, JSON.stringify(typedData)],
    });
  };
};
