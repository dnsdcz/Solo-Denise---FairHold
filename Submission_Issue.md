## Project Name
FairHold

## One-Line Description
A decentralized, trustless rental escrow system on Stellar Soroban that secures tenant deposits and requires mutual agreement for deductions.

## Track
Track 3 DeFi, Stablecoins & Real-World Assets

## Problem It Solves
In the Philippines and globally, renting property requires significant upfront security deposits. Tenants often face the risk of losing these deposits to unfair landlords who arbitrarily withhold funds, while landlords need genuine financial security against damages. Traditional escrow services are inaccessible, expensive, and slow. FairHold solves this trust gap by locking funds in a transparent, immutable smart contract where deductions can only be made if both parties agree, ensuring complete fairness.

## How It Uses Stellar
FairHold leverages **Stellar Soroban Smart Contracts** to act as a decentralized, unbiased escrow agent. The smart contract holds native XLM on the Stellar Testnet securely. It requires multi-party authorization using the `@stellar/freighter-api` to authenticate users and cryptographically sign transactions. By utilizing Soroban's robust state management, it securely tracks `Balance` and `ProposedDeductions` on-chain, ensuring funds cannot move without cryptographic proof of agreement.

## GitHub Repository
https://github.com/dnsdcz/Solo-Denise---FairHold.git

## Network & Deployment
- Network: testnet
- Live app URL: runs locally — see README
- Contract IDs / asset issuers: Our compiled Soroban WASM Hash is `f25bc5a94db27f0511e2373592669ccebef251badd32a5188559b131ec61ef5e`

## Team
- Denise Dela Cruz — @dnsdcz

## Novelty Note (optional, for bonus points)
Unlike standard escrow solutions which rely on trusted third parties or arbitrary centralized dispute resolutions, FairHold mathematically guarantees that a landlord cannot unilaterally drain a tenant's deposit. By leveraging Stellar's incredibly low fees and fast finality, it makes micro-escrows for everyday rentals practical and affordable for the first time.

## Anything Else
Future iterations will include native USDC support via Stellar assets and an integration with a decentralized oracle for automated dispute resolution!
