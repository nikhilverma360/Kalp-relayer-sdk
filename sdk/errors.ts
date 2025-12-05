/**
 * Custom error classes for KalpRelaySDK
 */

export class KalpRelayError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'KalpRelayError';
  }
}

export class WalletNotConnectedError extends KalpRelayError {
  constructor() {
    super('Wallet not connected', 'WALLET_NOT_CONNECTED');
    this.name = 'WalletNotConnectedError';
  }
}

export class SponsorFetchError extends KalpRelayError {
  constructor(details?: unknown) {
    super('Failed to fetch sponsor address', 'SPONSOR_FETCH_ERROR', details);
    this.name = 'SponsorFetchError';
  }
}

export class SignatureError extends KalpRelayError {
  constructor(details?: unknown) {
    super('Failed to sign transaction', 'SIGNATURE_ERROR', details);
    this.name = 'SignatureError';
  }
}

export class RelaySubmissionError extends KalpRelayError {
  constructor(message: string, details?: unknown) {
    super(message, 'RELAY_SUBMISSION_ERROR', details);
    this.name = 'RelaySubmissionError';
  }
}

export class ChainNotSupportedError extends KalpRelayError {
  constructor(chainId: number) {
    super(
      `Chain ID ${chainId} is not supported. Please configure this chain first.`,
      'CHAIN_NOT_SUPPORTED',
      { chainId }
    );
    this.name = 'ChainNotSupportedError';
  }
}

export class RequestTimeoutError extends KalpRelayError {
  constructor(details?: unknown) {
    super('Request timed out', 'REQUEST_TIMEOUT', details);
    this.name = 'RequestTimeoutError';
  }
}
