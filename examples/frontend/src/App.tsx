import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { KalpRelaySDK, createMetaMaskSigner } from 'kalp-relayer-sdk';
import './App.css';

// Configuration - Update these with your deployed contract addresses
const CONFIG = {
  chainId: 11155111, // Sepolia
  relayerAddress: '0xfC9aa13f0f1c436E20e0d970Ed076A054C563699',
  domainName: 'KalpRelayer',
  domainVersion: '1.0.0',
  sponsorAddress: '0xd22fb5ce742c5b293e34070d9f93a50590e7cc41',
  relayApiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/relay',
  apiKey: 'f74cbcad99351d5903cb7167cdbffbe0e1e53decf67b3ab29cb8584dbac96710',
  facilitatorAddress: '0xC9404AfEB8b6A7D4b1d44C01eEC86f068D534248',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  // Default token: USDC on Sepolia
  defaultTokenAddress: '0x4D17116CF11cd4B8964280a1b178C2D9a2A0C51C',
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  // Wallet state
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkError, setNetworkError] = useState<string>('');

  // Token transfer state
  const [tokenAddress, setTokenAddress] = useState(CONFIG.defaultTokenAddress);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Token info state
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
  } | null>(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setNetworkError('Please install MetaMask to use this app');
      return;
    }

    setIsConnecting(true);
    setNetworkError('');

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);

        // Check if on correct network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdDecimal = parseInt(chainId, 16);

        if (chainIdDecimal !== CONFIG.chainId) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${CONFIG.chainId.toString(16)}` }],
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              setNetworkError(
                `Please add Sepolia network to MetaMask. Chain ID: ${CONFIG.chainId}`
              );
            } else {
              setNetworkError('Please switch to Sepolia network in MetaMask');
            }
          }
        }
      }
    } catch (err: any) {
      setNetworkError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount('');
    setTokenInfo(null);
    setTxHash('');
    setError('');
  };

  // Load token information
  const loadTokenInfo = async () => {
    if (!account || !tokenAddress) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
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
        tokenContract.balanceOf(account),
      ]);

      setTokenInfo({
        name,
        symbol,
        decimals: Number(decimals),
        balance: ethers.formatUnits(balance, decimals),
      });
    } catch (err) {
      console.error('Failed to load token info:', err);
      setTokenInfo(null);
    }
  };

  // Execute gasless token transfer
  const executeTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account || !tokenAddress || !recipientAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    setIsTransferring(true);
    setError('');
    setTxHash('');

    try {
      // Create MetaMask signer
      const signerFn = createMetaMaskSigner();

      // Initialize SDK
      const sdk = new KalpRelaySDK(
        {
          chainId: CONFIG.chainId,
          relayerAddress: CONFIG.relayerAddress,
          domainName: CONFIG.domainName,
          domainVersion: CONFIG.domainVersion,
          sponsorAddress: CONFIG.sponsorAddress,
          relayApiUrl: CONFIG.relayApiUrl,
          apiKey: CONFIG.apiKey,
          chains: {
            [CONFIG.chainId]: {
              chainId: CONFIG.chainId,
              relayerAddress: CONFIG.relayerAddress,
              domainName: CONFIG.domainName,
              domainVersion: CONFIG.domainVersion,
              sponsorAddress: CONFIG.sponsorAddress,
              relayApiUrl: CONFIG.relayApiUrl,
              rpcUrl: CONFIG.rpcUrl,
              chainName: 'Sepolia',
            },
          },
        },
        signerFn
      );

      // Convert amount to token's smallest unit
      const decimals = tokenInfo?.decimals || 18;
      const amountInWei = ethers.parseUnits(amount, decimals);

      console.log('Initiating gasless token transfer...');
      console.log('Token:', tokenAddress);
      console.log('From:', account);
      console.log('To:', recipientAddress);
      console.log('Amount:', amount, tokenInfo?.symbol);

      // Execute the gasless transfer
      const result = await sdk.sendTokenTransfer({
        tokenAddress,
        recipient: recipientAddress,
        amount: amountInWei.toString(),
        userAddress: account,
        facilitatorAddress: CONFIG.facilitatorAddress,
      });

      console.log('Transfer successful!', result);
      setTxHash(result.txHash);

      // Refresh token balance
      setTimeout(() => loadTokenInfo(), 2000);

      // Clear form
      setRecipientAddress('');
      setAmount('');
    } catch (err: any) {
      console.error('Transfer failed:', err);
      setError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Load token info when account or token address changes
  useEffect(() => {
    if (account && tokenAddress) {
      loadTokenInfo();
    }
  }, [account, tokenAddress]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return (
    <div className="App">
      <header className="header">
        <h1>🚀 Kalp Relayer</h1>
        <p className="subtitle">Gasless ERC20 Token Transfers with MetaMask</p>
      </header>

      <main className="main">
        {/* Wallet Connection */}
        {!account ? (
          <div className="card">
            <h2>Connect Your Wallet</h2>
            <p>Connect your MetaMask wallet to start sending tokens without gas fees</p>

            {!isMetaMaskInstalled() ? (
              <div className="warning">
                <p>⚠️ MetaMask is not installed</p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                >
                  Install MetaMask
                </a>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="button button-primary"
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            )}

            {networkError && <div className="error">{networkError}</div>}
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="card">
              <div className="wallet-info">
                <div>
                  <strong>Connected Wallet:</strong>
                  <p className="address">{account}</p>
                </div>
                <button onClick={disconnectWallet} className="button button-small">
                  Disconnect
                </button>
              </div>
            </div>

            {/* Token Info */}
            {tokenInfo && (
              <div className="card token-info">
                <h3>{tokenInfo.name} ({tokenInfo.symbol})</h3>
                <p className="balance">
                  Balance: <strong>{tokenInfo.balance} {tokenInfo.symbol}</strong>
                </p>
              </div>
            )}

            {/* Transfer Form */}
            <div className="card">
              <h2>Send Tokens (Gasless)</h2>
              <form onSubmit={executeTransfer} className="transfer-form">
                <div className="form-group">
                  <label htmlFor="tokenAddress">Token Address</label>
                  <input
                    id="tokenAddress"
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                  <small>ERC20 token with EIP-2612 permit support</small>
                </div>

                <div className="form-group">
                  <label htmlFor="recipient">Recipient Address</label>
                  <input
                    id="recipient"
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="amount">
                    Amount {tokenInfo ? `(${tokenInfo.symbol})` : ''}
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    required
                  />
                  {tokenInfo && (
                    <small>Available: {tokenInfo.balance} {tokenInfo.symbol}</small>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isTransferring || !tokenInfo}
                  className="button button-primary button-large"
                >
                  {isTransferring ? (
                    <>
                      <span className="spinner"></span>
                      Transferring...
                    </>
                  ) : (
                    'Send Tokens (No Gas Required)'
                  )}
                </button>
              </form>

              {/* Transfer Status */}
              {txHash && (
                <div className="success">
                  ✅ Transfer successful!
                  <br />
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    View on Etherscan →
                  </a>
                </div>
              )}

              {error && <div className="error">{error}</div>}
            </div>

            {/* How it works */}
            <div className="card info-card">
              <h3>How it Works</h3>
              <ol>
                <li>
                  <strong>Sign Permit:</strong> Approve the facilitator to spend your tokens
                  (EIP-2612)
                </li>
                <li>
                  <strong>Sign Meta-Transaction:</strong> Authorize the relayer to execute the
                  transfer
                </li>
                <li>
                  <strong>Relayer Executes:</strong> The relayer pays the gas and executes your
                  transaction
                </li>
                <li>
                  <strong>Tokens Transferred:</strong> Recipient receives tokens, you paid zero
                  gas!
                </li>
              </ol>
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Powered by <strong>Kalp Relayer SDK</strong>
        </p>
        <p className="small">
          Make sure you're on Sepolia testnet and using tokens with EIP-2612 permit support
        </p>
      </footer>
    </div>
  );
}

export default App;
