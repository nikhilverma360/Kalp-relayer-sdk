# Changelog

All notable changes to the Kalp Relayer SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-12-05

### 🎉 Major Update: Ethers v6 Support

This release migrates the SDK to ethers v6, bringing improved performance, smaller bundle sizes, and better TypeScript support.

### Changed

- **BREAKING:** Upgraded from ethers v5 to v6
  - `ethers.providers.JsonRpcProvider` → `ethers.JsonRpcProvider`
  - `ethers.providers.Web3Provider` → `ethers.BrowserProvider`
  - `ethers.utils.*` → `ethers.*` (utilities moved to top-level)
  - `provider.getSigner()` is now async
  - Native `BigInt` support instead of `BigNumber` class

### Updated

- All examples updated to use ethers v6 syntax
- Documentation updated with v6 examples
- Wallet signers updated for v6 compatibility
  - `createEthersSigner()` - Now uses ethers v6 Signer
  - `createMetaMaskSigner()` - Updated to use `BrowserProvider`
  - `createEip1193Signer()` - No changes (still works)

### Added

- `MIGRATION_TO_V6.md` - Comprehensive migration guide
- Updated `README.md` with ethers v6 examples
- Updated `GETTING_STARTED.md` with v6 patterns
- Example files updated:
  - `examples/basic/src/index.ts`
  - `examples/basic/src/ethers-provider-example.ts`
  - `examples/basic/src/metamask-example.ts`

### Migration Required

If you're upgrading from v0.1.x, please follow the [Migration Guide](./MIGRATION_TO_V6.md).

**Quick migration checklist:**
1. Update ethers: `npm install ethers@^6.13.0`
2. Update imports: `ethers.providers.*` → `ethers.*`
3. Update utilities: `ethers.utils.*` → `ethers.*`
4. Make `getSigner()` async: `await provider.getSigner()`

## [0.1.0] - 2024-12-05

### Added

- Initial release of Kalp Relayer SDK
- Universal wallet support with ethers.js v5
- Three wallet signer factory functions:
  - `createEthersSigner()` - For ethers.js Wallet/Signer
  - `createMetaMaskSigner()` - For MetaMask browser extension
  - `createEip1193Signer()` - For EIP-1193 providers
- EIP-712 typed data signing support
- Meta-transaction relay for ERC-2771 contracts
- TypeScript support with full type definitions
- Monorepo architecture with npm workspaces
- Comprehensive examples:
  - Node.js with private key
  - MetaMask browser integration
  - WalletConnect integration
  - Various ethers.js providers
- Documentation:
  - Main README with API reference
  - Getting Started guide
  - Example documentation
- Custom error classes:
  - `KalpRelayError`
  - `WalletNotConnectedError`
  - `SponsorFetchError`
  - `SignatureError`
  - `RelaySubmissionError`

### Features

- Gasless transaction execution
- Multi-chain support
- Sponsor address configuration
- Function data encoding helper
- Environment variable configuration
- TypeScript type safety

---

## Version History

- **0.2.0** - Ethers v6 support (current)
- **0.1.0** - Initial release with ethers v5
