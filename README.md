# FairHold

A decentralized, trustless rental escrow system on Stellar Soroban that secures tenant deposits and requires mutual agreement for deductions.

## Problem
In the Philippines (and globally), renting property requires significant upfront security deposits. Tenants often face the risk of losing these deposits to unfair landlords who arbitrarily withhold funds. Conversely, landlords need genuine financial security against property damages. Traditional escrow services are inaccessible, expensive, and slow. FairHold solves this trust gap by locking funds in an immutable smart contract.

## How It Works
1. **Create Escrow**: A Tenant creates an escrow contract and deposits their rent security (in XLM).
2. **Locking**: The funds are mathematically locked on the Stellar blockchain.
3. **Propose Deduction**: At the end of the lease, the Landlord can propose a deduction for any damages. 
4. **Approve & Release**: The Tenant reviews the deduction. If approved, the contract instantly splits the funds: sending the deduction to the Landlord and refunding the remaining balance back to the Tenant.

## How It Uses Stellar
FairHold utilizes **Stellar Soroban Smart Contracts** to act as a decentralized, unbiased escrow agent. 
- It uses Soroban's robust state management to track balances and proposed deductions.
- It leverages the modern `@stellar/freighter-api` (v6) for wallet connection and transaction signing.
- Stellar was chosen for its incredibly low transaction fees and lightning-fast finality, making everyday rental escrows practical.

## Track
Track 3 DeFi, Stablecoins & Real-World Assets

## Tech Stack
- Framework: React + Vite
- Stellar SDK: `@stellar/stellar-sdk`
- Wallet Integration: `@stellar/freighter-api`
- Backend: Express.js + MySQL (for off-chain contract indexing)
- Network: testnet

## Setup & Run
To run this project locally, you will need Node.js, XAMPP (for MySQL), and the Freighter browser extension.

```bash
# 1. Clone the repository
git clone https://github.com/dnsdcz/Solo-Denise---FairHold.git
cd Solo-Denise---FairHold

# 2. Install Dependencies
npm install

# 3. Start the Backend Database Server
# Ensure XAMPP MySQL is running on your local machine
node backend.js

# 4. In a new terminal, Start the Frontend
npm run dev
```

## Network Details
- Network: testnet
- RPC URL: `https://soroban-testnet.stellar.org`
- Contract WASM Hash: `f25bc5a94db27f0511e2373592669ccebef251badd32a5188559b131ec61ef5e`

## Team
- Denise Dela Cruz — @dnsdcz

## License
MIT
