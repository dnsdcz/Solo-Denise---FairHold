import React, { useState, useEffect } from 'react';
import { createAndInitEscrow, deposit, proposeDeduction, approveDeduction, getContractState } from '../stellar/sorobanService';
import { ShieldCheck, ArrowRight, DollarSign, PenTool, Lock, RefreshCw, AlertCircle } from 'lucide-react';

export default function EscrowDashboard({ publicKey }) {
  const [role, setRole] = useState('tenant'); 
  const [landlordKey, setLandlordKey] = useState('');
  const [depositAmount, setDepositAmount] = useState('5');
  
  const [contractIdInput, setContractIdInput] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [escrows, setEscrows] = useState([]);
  const [activeEscrow, setActiveEscrow] = useState(null);

  // Fetch from MySQL Backend
  const fetchEscrows = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/escrows/${publicKey}`);
      if (res.ok) {
        const data = await res.json();
        setEscrows(data);
      }
    } catch (e) {
      console.warn("Could not fetch escrows from DB. Is backend running?", e);
    }
  };

  useEffect(() => {
    fetchEscrows();
  }, [publicKey]);

  const loadContractState = async (cId) => {
    setLoading(true);
    setStatus('Loading contract state from blockchain...');
    const state = await getContractState(cId, publicKey);
    setActiveEscrow({ id: cId, ...state });
    setStatus('');
    setLoading(false);
  };

  const handleCreateAndDeposit = async () => {
    if (!landlordKey) return alert('Enter landlord public key');
    setLoading(true);
    setStatus('Deploying Escrow Contract instance...');
    try {
      const newContractId = await createAndInitEscrow(publicKey, landlordKey);
      
      setStatus(`Contract deployed! Depositing ${depositAmount} XLM...`);
      await deposit(newContractId, publicKey, depositAmount);
      
      // Save to DB
      try {
        await fetch(`http://localhost:3001/api/escrows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: newContractId, tenantKey: publicKey, landlordKey })
        });
      } catch (e) {
         console.warn("Failed to save to DB");
      }

      setStatus('Escrow Created and Funded Successfully!');
      fetchEscrows();
      loadContractState(newContractId);
    } catch (e) {
      console.error(e);
      if (e.message && e.message.includes("not found")) {
         setStatus("Error: Account not found on the network. Please make sure your Freighter account is funded with Testnet XLM (use Friendbot).");
      } else {
         setStatus('Error: ' + e.message);
      }
    }
    setLoading(false);
  };

  const handleProposeDeduction = async () => {
    if (!activeEscrow || !deductionAmount) return;
    setLoading(true);
    setStatus('Proposing deduction to smart contract...');
    try {
      await proposeDeduction(activeEscrow.id, publicKey, deductionAmount);
      setStatus('Deduction proposed successfully! Waiting for tenant approval.');
      await loadContractState(activeEscrow.id);
    } catch (e) {
      console.error(e);
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleApproveDeduction = async () => {
    if (!activeEscrow) return;
    setLoading(true);
    setStatus('Approving deduction on smart contract...');
    try {
      await approveDeduction(activeEscrow.id, publicKey);
      setStatus('Deduction Approved and Funds Released!');
      await loadContractState(activeEscrow.id);
    } catch (e) {
      console.error(e);
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-grid">
      <div className="glass-card">
        <h2>Your Role</h2>
        <div className="role-selector">
          <button 
            className={`role-btn ${role === 'tenant' ? 'active' : ''}`}
            onClick={() => { setRole('tenant'); setActiveEscrow(null); setStatus(''); }}
          >
            Tenant
          </button>
          <button 
            className={`role-btn ${role === 'landlord' ? 'active' : ''}`}
            onClick={() => { setRole('landlord'); setActiveEscrow(null); setStatus(''); }}
          >
            Landlord
          </button>
        </div>

        {role === 'tenant' ? (
          <div className="role-section">
            <h3><ShieldCheck size={20}/> Create New Escrow</h3>
            <p>Deploy a secure Soroban contract and deposit funds.</p>
            <input 
              type="text" 
              placeholder="Landlord's Stellar Public Key" 
              value={landlordKey}
              onChange={e => setLandlordKey(e.target.value)}
            />
            <input 
              type="number" 
              placeholder="Deposit Amount (Testnet XLM/USDC)" 
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
            />
            <button onClick={handleCreateAndDeposit} disabled={loading}>
              {loading ? 'Processing...' : 'Create & Deposit'} <ArrowRight size={16}/>
            </button>
          </div>
        ) : (
          <div className="role-section">
            <h3><Lock size={20}/> Load Escrow</h3>
            <p>Select from database or manually enter ID.</p>
            <select onChange={(e) => { if(e.target.value) loadContractState(e.target.value); }} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                <option value="">-- Select Escrow --</option>
                {escrows.filter(e => e.landlord_key === publicKey).map(e => (
                    <option key={e.contract_id} value={e.contract_id}>{e.contract_id.substring(0, 15)}...</option>
                ))}
            </select>
            <p style={{textAlign: 'center', margin: '0.5rem 0'}}>OR</p>
            <input 
              type="text" 
              placeholder="Manual Contract ID" 
              value={contractIdInput}
              onChange={e => setContractIdInput(e.target.value)}
            />
            <button onClick={() => loadContractState(contractIdInput)} disabled={loading || !contractIdInput}>
              Load Contract
            </button>
          </div>
        )}
      </div>

      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Active Escrow Overview</h2>
          {activeEscrow && (
            <button onClick={() => loadContractState(activeEscrow.id)} className="role-btn" style={{padding: '0.5rem'}} title="Refresh">
               <RefreshCw size={16} />
            </button>
          )}
        </div>
        
        {status && (
          <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', marginBottom: '2rem' }}>
            <AlertCircle size={16} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
            <span style={{verticalAlign: 'middle'}}>{status}</span>
          </div>
        )}

        {role === 'tenant' && !activeEscrow && escrows.filter(e => e.tenant_key === publicKey).length > 0 && (
           <div style={{ marginBottom: '2rem' }}>
              <h3>Your Database Escrows</h3>
              {escrows.filter(e => e.tenant_key === publicKey).map(esc => (
                  <div key={esc.contract_id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <span className="wallet-address">{esc.contract_id.substring(0,10)}...</span>
                      <button style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => loadContractState(esc.contract_id)}>View</button>
                  </div>
              ))}
           </div>
        )}

        {role === 'landlord' && !activeEscrow && escrows.filter(e => e.landlord_key === publicKey).length > 0 && (
           <div style={{ marginBottom: '2rem' }}>
              <h3>Escrows Assigned to You</h3>
              {escrows.filter(e => e.landlord_key === publicKey).map(esc => (
                  <div key={esc.contract_id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <span className="wallet-address">{esc.contract_id.substring(0,10)}...</span>
                      <button style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => loadContractState(esc.contract_id)}>View</button>
                  </div>
              ))}
           </div>
        )}

        {activeEscrow ? (
            <div className="escrow-details" style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px'}}>
                <p><strong>Contract ID:</strong> <span className="wallet-address" style={{fontSize:'0.8rem'}}>{activeEscrow.id}</span></p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem'}}>
                    <div>
                        <p style={{marginBottom: 0}}>Current Balance</p>
                        <h3 style={{color: 'var(--success)'}}>{activeEscrow.balance} XLM/USDC</h3>
                    </div>
                    <div>
                        <p style={{marginBottom: 0}}>Pending Deduction</p>
                        <h3 style={{color: activeEscrow.proposed > 0 ? 'var(--danger)' : 'var(--text-muted)'}}>{activeEscrow.proposed} XLM/USDC</h3>
                    </div>
                </div>

                <hr style={{ borderColor: 'var(--border-light)', margin: '1.5rem 0' }} />

                {role === 'tenant' ? (
                    <div>
                        {activeEscrow.proposed > 0 ? (
                           <div style={{background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
                               <h3 style={{color: 'var(--danger)'}}><DollarSign size={20} style={{verticalAlign:'middle'}}/> Action Required</h3>
                               <p>The landlord has proposed a deduction of {activeEscrow.proposed}. If you approve, they receive {activeEscrow.proposed} and you get refunded {activeEscrow.balance - activeEscrow.proposed}.</p>
                               <button className="success" onClick={handleApproveDeduction} disabled={loading} style={{width: '100%', justifyContent: 'center'}}>
                                 {loading ? 'Processing...' : 'Approve & Release Funds'}
                               </button>
                           </div>
                        ) : (
                           <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No pending deductions from landlord.</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {activeEscrow.balance > 0 ? (
                            <div>
                                {activeEscrow.proposed === 0 ? (
                                    <>
                                        <h3><PenTool size={20} style={{verticalAlign:'middle'}}/> Propose Deduction</h3>
                                        <input 
                                            type="number" 
                                            placeholder={`Amount (Max: ${activeEscrow.balance})`} 
                                            value={deductionAmount}
                                            onChange={e => setDeductionAmount(e.target.value)}
                                            style={{marginBottom: '0.5rem'}}
                                        />
                                        <button onClick={handleProposeDeduction} disabled={loading} style={{width: '100%', justifyContent: 'center'}}>
                                            {loading ? 'Processing...' : 'Submit Proposal'}
                                        </button>
                                    </>
                                ) : (
                                    <p style={{textAlign: 'center', color: 'var(--primary)'}}>Waiting for tenant to approve the {activeEscrow.proposed} deduction.</p>
                                )}
                            </div>
                        ) : (
                            <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>This escrow contract is empty/closed.</p>
                        )}
                    </div>
                )}
            </div>
        ) : (
           <div style={{textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)'}}>
               Select or load an escrow contract to view its details.
           </div>
        )}
      </div>
    </div>
  );
}
