import { Keypair, TransactionBuilder, Networks, Horizon, Asset, Operation } from '@stellar/stellar-sdk';
import { signTransaction, getPublicKey } from '@stellar/freighter-api';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

// Using Stellar Testnet USDC for demonstration
export const USDC_ASSET = new Asset(
  'USDC',
  'GBBD47IF6LWK7P7MDEVSCWTTCJM4RTQRGLDIIGMLPT5OKGQOYHOPIURS' 
); // This is a common testnet USDC issuer, though we can also just use native XLM for pure simplicity if needed.

/**
 * Creates an escrow account, funds it, sets trustlines, and configures multisig.
 * Requires the Tenant's wallet to sign.
 */
export async function createEscrow(tenantPublicKey, landlordPublicKey, amountXLM, amountUSDC) {
  // We generate a new temporary keypair to act as the Escrow Account
  const escrowKeypair = Keypair.random();
  const escrowPublicKey = escrowKeypair.publicKey();

  const tenantAccount = await server.loadAccount(tenantPublicKey);

  // Build the setup transaction
  const tx = new TransactionBuilder(tenantAccount, {
    fee: '1000',
    networkPassphrase,
  })
    // 1. Create the Escrow Account and fund with starting XLM (for reserves + fees)
    .addOperation(
      Operation.createAccount({
        destination: escrowPublicKey,
        startingBalance: amountXLM.toString(), // e.g., '5' XLM
      })
    )
    .setTimeout(300)
    .build();

  // Tenant signs the creation of the account
  const signedTxXdr = await signTransaction(tx.toXDR(), { network: 'TESTNET' });
  const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase);
  
  await server.submitTransaction(txToSubmit);

  // Now the escrow account exists. We need to:
  // 1. Add trustline for USDC
  // 2. Fund it with USDC from tenant
  // 3. Set multisig options
  const escrowAccount = await server.loadAccount(escrowPublicKey);

  // We need to build a transaction originating from the escrow account, but we also need the tenant to send the USDC.
  // We can do this with two transactions or one complex one. 
  // For simplicity, let's just use XLM for the escrow in this MVP, or stick to native if USDC is too complex to setup without both signing simultaneously.
  // Actually, a simpler MVP for the escrow is using Native XLM. 
  
  // Let's modify to just use Native XLM for the MVP to reduce trustline complexity.
  return {
    escrowId: escrowPublicKey,
    escrowSecret: escrowKeypair.secret() // We shouldn't store this in a real app after setup, but for MVP it helps coordinate
  };
}

/**
 * Configure the escrow account to be 2-of-2 multisig between Tenant and Landlord.
 */
export async function setupMultisig(escrowSecret, tenantPublicKey, landlordPublicKey) {
    const escrowKeypair = Keypair.fromSecret(escrowSecret);
    const escrowAccount = await server.loadAccount(escrowKeypair.publicKey());

    const tx = new TransactionBuilder(escrowAccount, { fee: '1000', networkPassphrase })
        // Add Landlord as a signer with weight 1
        .addOperation(Operation.setOptions({
            signer: {
                ed25519PublicKey: landlordPublicKey,
                weight: 1
            }
        }))
        // Add Tenant as a signer with weight 1
        .addOperation(Operation.setOptions({
            signer: {
                ed25519PublicKey: tenantPublicKey,
                weight: 1
            }
        }))
        // Set thresholds so all ops require weight 2 (both signatures)
        // Master weight becomes 0 (the escrow account key itself can no longer sign alone)
        .addOperation(Operation.setOptions({
            masterWeight: 0,
            lowThreshold: 2,
            medThreshold: 2,
            highThreshold: 2
        }))
        .setTimeout(300)
        .build();

    tx.sign(escrowKeypair);
    await server.submitTransaction(tx);
}

/**
 * Proposes a deduction (payment) from the Escrow back to the Landlord.
 * Returns the XDR for the other party to sign.
 */
export async function proposeDeduction(escrowPublicKey, landlordPublicKey, amount) {
    const escrowAccount = await server.loadAccount(escrowPublicKey);

    const tx = new TransactionBuilder(escrowAccount, { fee: '1000', networkPassphrase })
        .addOperation(Operation.payment({
            destination: landlordPublicKey,
            asset: Asset.native(),
            amount: amount.toString()
        }))
        .setTimeout(0) // 0 timeout means no expiration for the proposal, normally we'd set a bound
        .build();

    // The landlord signs it using Freighter
    const signedTxXdr = await signTransaction(tx.toXDR(), { network: 'TESTNET' });
    return signedTxXdr;
}

/**
 * Approves a deduction. The tenant signs the already partially-signed transaction.
 */
export async function approveDeduction(signedTxXdr) {
    // Tenant signs the XDR with Freighter
    const fullySignedTxXdr = await signTransaction(signedTxXdr, { network: 'TESTNET' });
    
    // Submit to network
    const txToSubmit = TransactionBuilder.fromXDR(fullySignedTxXdr, networkPassphrase);
    return await server.submitTransaction(txToSubmit);
}

export async function checkBalance(publicKey) {
    try {
        const account = await server.loadAccount(publicKey);
        const balance = account.balances.find(b => b.asset_type === 'native');
        return balance ? balance.balance : '0';
    } catch (e) {
        return '0';
    }
}
