import React, { useState, useEffect } from 'react';
import { isConnected, requestAccess, getAddress, setAllowed } from '@stellar/freighter-api';
import { Wallet } from 'lucide-react';

export default function WalletConnect({ onConnect }) {
  const [pubKey, setPubKey] = useState('');
  const [isFreighterAvailable, setIsFreighterAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const connected = await isConnected();
      setIsFreighterAvailable(connected);
      // Auto connect if they already granted access
      if (connected) {
        let key = null;
        if (typeof getAddress === 'function') {
           const result = await getAddress();
           key = typeof result === 'string' ? result : (result.address || result.publicKey || '');
        }
        if (key && typeof key === 'string') {
          setPubKey(key);
          onConnect(key);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnect = async () => {
    if (!isFreighterAvailable) {
      alert('Please install Freighter Wallet extension!');
      return;
    }
    
    setIsConnecting(true);
    try {
      if (typeof setAllowed === 'function') {
        await setAllowed();
      }
      let key = null;
      if (typeof getAddress === 'function') {
         const result = await getAddress();
         key = typeof result === 'string' ? result : (result.address || result.publicKey || '');
      }
      if (key && typeof key === 'string') {
        setPubKey(key);
        onConnect(key);
      } else {
        alert("Wallet access was denied or locked. Please open the extension and unlock it.");
      }
    } catch (e) {
      console.error('Failed to connect', e);
      alert("Freighter Error: " + (e.message || e));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="wallet-connect">
      {pubKey ? (
        <div className="wallet-address">
          {pubKey.substring(0, 6)}...{pubKey.substring(pubKey.length - 4)}
        </div>
      ) : (
        <button onClick={handleConnect} disabled={isConnecting} className="glow-btn">
          <Wallet size={18} /> {isConnecting ? 'Connecting...' : 'Connect Freighter'}
        </button>
      )}
    </div>
  );
}
