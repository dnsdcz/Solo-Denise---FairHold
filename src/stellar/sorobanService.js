import { Keypair, TransactionBuilder, Networks, rpc, Asset, Operation, Contract, xdr, Address, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';
import { signTransaction, getAddress, setAllowed } from '@stellar/freighter-api';
import { Buffer } from 'buffer';

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;
export const WASM_ID = 'f25bc5a94db27f0511e2373592669ccebef251badd32a5188559b131ec61ef5e';
export const TOKEN_ID = Asset.native().contractId(networkPassphrase); 

async function submitSorobanTx(tx, publicKey) {
    const simulated = await server.simulateTransaction(tx);
    if (simulated.error) {
        throw new Error(simulated.error);
    }
    const assembledTx = rpc.assembleTransaction(tx, simulated).build();
    if (typeof setAllowed === 'function') await setAllowed();
    const signResult = await signTransaction(assembledTx.toXDR(), { networkPassphrase });
    if (signResult.error) {
         throw new Error(signResult.error);
    }
    const txToSubmit = TransactionBuilder.fromXDR(signResult.signedTxXdr, networkPassphrase);
    const response = await server.sendTransaction(txToSubmit);

    let status;
    while (true) {
        status = await server.getTransaction(response.hash);
        if (status.status !== 'NOT_FOUND') {
            break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    
    if (status.status === 'SUCCESS') {
        return status;
    } else {
        throw new Error("Transaction Failed");
    }
}

export async function createAndInitEscrow(tenantKey, landlordKey) {
  const tenantAccount = await server.getAccount(tenantKey);
  const createTx = new TransactionBuilder(tenantAccount, { fee: '1000', networkPassphrase })
    .addOperation(Operation.createCustomContract({
        address: Address.fromString(tenantKey),
        wasmHash: Buffer.from(WASM_ID, 'hex')
    }))
    .setTimeout(300)
    .build();
    
  const createStatus = await submitSorobanTx(createTx, tenantKey);
  const contractIdScVal = createStatus.returnValue; 
  const contractId = scValToNative(contractIdScVal);
  
  const contract = new Contract(contractId);
  const tenantAccountUpdated = await server.getAccount(tenantKey);
  const initTx = new TransactionBuilder(tenantAccountUpdated, { fee: '1000', networkPassphrase })
    .addOperation(contract.call('init',
      nativeToScVal(Address.fromString(tenantKey), { type: 'address' }),
      nativeToScVal(Address.fromString(landlordKey), { type: 'address' }),
      nativeToScVal(Address.fromString(TOKEN_ID), { type: 'address' })
    ))
    .setTimeout(300)
    .build();

  await submitSorobanTx(initTx, tenantKey);
  return contractId;
}

export async function deposit(contractId, tenantKey, amount) {
    const contract = new Contract(contractId);
    const tenantAccount = await server.getAccount(tenantKey);
    const stroops = BigInt(Math.floor(amount * 10000000));

    const tx = new TransactionBuilder(tenantAccount, { fee: '1000', networkPassphrase })
      .addOperation(contract.call('deposit', nativeToScVal(stroops, { type: 'i128' })))
      .setTimeout(300)
      .build();

    await submitSorobanTx(tx, tenantKey);
}

export async function proposeDeduction(contractId, landlordKey, amount) {
    const contract = new Contract(contractId);
    const landlordAccount = await server.getAccount(landlordKey);
    const stroops = BigInt(Math.floor(amount * 10000000));

    const tx = new TransactionBuilder(landlordAccount, { fee: '1000', networkPassphrase })
      .addOperation(contract.call('propose_deduction', nativeToScVal(stroops, { type: 'i128' })))
      .setTimeout(300)
      .build();

    await submitSorobanTx(tx, landlordKey);
}

export async function approveDeduction(contractId, tenantKey) {
    const contract = new Contract(contractId);
    const tenantAccount = await server.getAccount(tenantKey);

    const tx = new TransactionBuilder(tenantAccount, { fee: '1000', networkPassphrase })
      .addOperation(contract.call('approve_deduction'))
      .setTimeout(300)
      .build();

    await submitSorobanTx(tx, tenantKey);
}

export async function getContractState(contractId, anyPublicKey) {
    try {
        const contract = new Contract(contractId);
        const dummyAccount = await server.getAccount(anyPublicKey);
        
        // Read Balance
        const balTx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase })
            .addOperation(contract.call('get_balance'))
            .setTimeout(300)
            .build();
        const balSim = await server.simulateTransaction(balTx);
        let balance = 0;
        if (balSim.result && balSim.result.retval) {
            balance = Number(scValToNative(balSim.result.retval)) / 10000000;
        }

        // Read Proposed Deduction
        const propTx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase })
            .addOperation(contract.call('get_proposed_deduction'))
            .setTimeout(300)
            .build();
        const propSim = await server.simulateTransaction(propTx);
        let proposed = 0;
        if (propSim.result && propSim.result.retval) {
            proposed = Number(scValToNative(propSim.result.retval)) / 10000000;
        }

        return { balance, proposed };
    } catch (e) {
        console.error("Failed to read contract state:", e);
        return { balance: 0, proposed: 0, error: true };
    }
}
