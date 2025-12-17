import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Configuration
const CONFIG = {
  apiUrl: 'https://alpha-wallet-api.kalp.studio/relayer/write-transaction',
  apiKey: 'f74cbcad99351d5903cb7167cdbffbe0e1e53decf67b3ab29cb8584dbac96710',
  contractAddress: '0x15CeE1b5Eb18e5FC8884862D66812B1BfB7D0e6c',
  chainId: 11155111, // Sepolia
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
};

const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'increment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'contextCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

function App() {
  const [custodialAddress, setCustodialAddress] = useState<string>('');
  const [addressInput, setAddressInput] = useState<string>('');
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Validate and set custodial address
  const handleSetAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!addressInput.trim()) {
      setError('Please enter an address');
      return;
    }

    if (!ethers.isAddress(addressInput)) {
      setError('Invalid Ethereum address');
      return;
    }

    setCustodialAddress(addressInput);
  };

  // Reset address
  const handleChangeAddress = () => {
    setCustodialAddress('');
    setAddressInput('');
    setTicketCount(0);
    setTxHash('');
    setError('');
  };

  // Fetch current ticket count
  const fetchTicketCount = async () => {
    if (!custodialAddress) return;

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
      const contract = new ethers.Contract(
        CONFIG.contractAddress,
        CONTRACT_ABI,
        provider
      );

      const count = await contract.contextCounter(custodialAddress);
      setTicketCount(Number(count));
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch ticket count:', err);
      setError('Failed to load ticket count');
      setIsLoading(false);
    }
  };

  // Claim a ticket via API
  const claimTicket = async () => {
    if (!custodialAddress) return;

    setIsClaiming(true);
    setError('');
    setTxHash('');

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': CONFIG.apiKey,
        },
        body: JSON.stringify({
          contractAddress: CONFIG.contractAddress,
          functionName: 'increment',
          params: [],
          abi: CONTRACT_ABI,
          fromAddress: custodialAddress,
          chainId: CONFIG.chainId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Ticket claimed successfully:', data);

      if (data.txHash) {
        setTxHash(data.txHash);
      }

      // Refresh ticket count after a short delay
      setTimeout(() => {
        fetchTicketCount();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to claim ticket:', err);
      setError(err.message || 'Failed to claim ticket. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  // Load ticket count when address is set
  useEffect(() => {
    if (custodialAddress) {
      fetchTicketCount();

      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchTicketCount, 10000);
      return () => clearInterval(interval);
    }
  }, [custodialAddress]);

  return (
    <div className="App">
      <header className="header">
        <h1>🎟️ Ticket Claim</h1>
        <p className="subtitle">Claim your free tickets on Sepolia testnet</p>
      </header>

      <main className="main">
        {!custodialAddress ? (
          /* Address Input Screen */
          <>
            <div className="card">
              <h2>Enter Custodial Address</h2>
              <p>Enter your custodial wallet address to view and claim tickets</p>

              <form onSubmit={handleSetAddress} className="address-form">
                <div className="form-group">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="0x..."
                    className="address-input"
                  />
                </div>

                <button
                  type="submit"
                  className="button button-primary button-large"
                >
                  Continue
                </button>
              </form>

              {error && <div className="error">{error}</div>}
            </div>

            {/* Info Card */}
            <div className="card info-card">
              <h3>How it Works</h3>
              <ol>
                <li>
                  <strong>Enter Address:</strong> Provide your custodial wallet address
                </li>
                <li>
                  <strong>View Tickets:</strong> See how many tickets you've claimed
                </li>
                <li>
                  <strong>Claim More:</strong> Click to claim additional tickets for free
                </li>
                <li>
                  <strong>No Gas Required:</strong> All transactions are paid by the custodial wallet
                </li>
              </ol>
            </div>
          </>
        ) : (
          /* Ticket Claiming Interface */
          <>
            {/* Address Display */}
            <div className="card">
              <div className="address-display">
                <div>
                  <strong>Custodial Address:</strong>
                  <p className="address">{custodialAddress}</p>
                </div>
                <button
                  onClick={handleChangeAddress}
                  className="button button-small"
                >
                  Change Address
                </button>
              </div>
            </div>

            {/* Ticket Counter Display */}
            <div className="card ticket-display">
              <div className="ticket-icon">🎫</div>
              <h2>Your Tickets</h2>
              {isLoading ? (
                <div className="loading">Loading...</div>
              ) : (
                <div className="ticket-count">{ticketCount}</div>
              )}
              <p className="ticket-label">Total Tickets Claimed</p>
            </div>

            {/* Claim Button */}
            <div className="card">
              <h2>Claim a Ticket</h2>
              <p>Click the button below to claim a new ticket for free!</p>

              <button
                onClick={claimTicket}
                disabled={isClaiming}
                className="button button-primary button-large"
              >
                {isClaiming ? (
                  <>
                    <span className="spinner"></span>
                    Claiming...
                  </>
                ) : (
                  '🎟️ Claim Ticket'
                )}
              </button>

              {txHash && (
                <div className="success">
                  ✅ Ticket claimed successfully!
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

            {/* Contract Info */}
            <div className="card info-card">
              <h3>Contract Details</h3>
              <div className="contract-info">
                <div>
                  <strong>Network:</strong> Sepolia Testnet
                </div>
                <div>
                  <strong>Contract:</strong>{' '}
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONFIG.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contract-link"
                  >
                    {CONFIG.contractAddress.slice(0, 6)}...{CONFIG.contractAddress.slice(-4)}
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Powered by <strong>Kalp Custodial Wallet API</strong>
        </p>
        <p className="small">
          Running on Sepolia testnet - Claim as many tickets as you want!
        </p>
      </footer>
    </div>
  );
}

export default App;
