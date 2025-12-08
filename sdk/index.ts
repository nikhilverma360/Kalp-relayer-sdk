/**
 * Kalp Relay SDK
 *
 * A TypeScript SDK for building gasless transactions using the Kalp Relay system.
 * This SDK handles EIP-712 signing and meta-transaction relay for ERC-2771 compatible contracts.
 *
 * @packageDocumentation
 */

export { KalpRelaySDK } from './KalpRelaySDK';

export type {
  KalpRelayConfig,
  RelayTransactionParams,
  RelayResult,
  SignTypedDataFunction,
  EIP712Message,
  EIP712Domain,
  TokenTransferParams,
  EIP2612Domain,
  EIP2612PermitMessage,
} from './types';

export {
  KalpRelayError,
  WalletNotConnectedError,
  SponsorFetchError,
  SignatureError,
  RelaySubmissionError,
} from './errors';

export {
  createMetaMaskSigner,
  createEthersSigner,
  createEip1193Signer,
} from './walletSigners';

export {
  getTokenNonce,
  getTokenDomain,
  signPermit,
  encodeFacilitatorCall,
  calculateDeadline,
} from './tokenTransfer';
