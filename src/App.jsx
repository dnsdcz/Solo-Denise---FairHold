import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import EscrowDashboard from './components/EscrowDashboard';
import { Shield } from 'lucide-react';
import './index.css';

function App() {
  const [publicKey, setPublicKey] = useState('');

  return (
    <>
      <nav className="navbar">
        <div className="logo-container">
          <Shield color="var(--primary)" size={28} />
          <h1>FairHold</h1>
        </div>
        <WalletConnect onConnect={setPublicKey} />
      </nav>

      <main className="app-container">
        {!publicKey ? (
          <div className="hero-section">
            <h2>Trustless Rental Deposits</h2>
            <p>
              Secure your rental deposits in a decentralized smart contract on the Stellar Soroban network. 
              No more disputes. No more withheld funds. Complete transparency for tenants and landlords.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Shield size={18} color="var(--success)" /> Multi-sig Security
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Shield size={18} color="var(--primary)" /> Smart Contract Escrow
              </div>
            </div>
          </div>
        ) : (
          <EscrowDashboard publicKey={publicKey} />
        )}
      </main>
    </>
  );
}

export default App;
