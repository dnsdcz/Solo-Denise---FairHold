import { Keypair, Networks, rpc, TransactionBuilder, Operation, Asset } from '@stellar/stellar-sdk';
import fs from 'fs';

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

async function main() {
  console.log("Generating keypair for deployment...");
  const deployer = Keypair.random();
  console.log("Public Key:", deployer.publicKey());
  console.log("Secret Key:", deployer.secret());

  console.log("Funding account from friendbot...");
  await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(deployer.publicKey())}`);

  const account = await server.getAccount(deployer.publicKey());

  console.log("Reading WASM file...");
  const wasm = fs.readFileSync('./contracts/escrow/target/wasm32-unknown-unknown/release/escrow.wasm');

  console.log("Building upload transaction...");
  const tx = new TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(300)
    .build();

  console.log("Preparing transaction...");
  const preparedTx = await server.prepareTransaction(tx);
  preparedTx.sign(deployer);

  console.log("Submitting transaction...");
  const response = await server.sendTransaction(preparedTx);
  if (response.status === 'ERROR') {
      console.error("Error:", response);
      return;
  }
  
  // Wait for the transaction to be processed
  console.log("Waiting for confirmation...");
  let txStatus;
  while (true) {
      txStatus = await server.getTransaction(response.hash);
      if (txStatus.status !== 'NOT_FOUND') {
          break;
      }
      await new Promise(r => setTimeout(r, 2000));
  }

  if (txStatus.status === 'SUCCESS') {
      const wasmId = txStatus.returnValue.value().toString('hex');
      console.log("SUCCESS! WASM ID:", wasmId);
      fs.writeFileSync('./wasmId.txt', wasmId);
  } else {
      console.log("Failed:", txStatus);
  }
}

main().catch(console.error);
