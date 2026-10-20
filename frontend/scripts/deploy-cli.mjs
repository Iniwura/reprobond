import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const keytar = require('C:/Users/DELL 7400/AppData/Local/npm-cache/_npx/bca7c8df09516de5/node_modules/keytar');

const { createClient, createAccount, isSuccessful } = await import('genlayer-js');
const { studioDevnet } = await import('genlayer-js/chains');

async function main() {
  console.log('=== ReproBond Candidate CLI Deployment ===');
  const contractPath = path.resolve(__dirname, '../../contracts/repro_bond.py');
  const code = fs.readFileSync(contractPath, 'utf8').replace(/\r\n/g, '\n');
  const sha256 = crypto.createHash('sha256').update(code).digest('hex');
  console.log('Contract file:', contractPath);
  console.log('Source SHA-256:', sha256);
  const EXPECTED_HASH = '2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82';
  if (sha256 !== EXPECTED_HASH) {
    throw new Error(`Hash mismatch! Expected ${EXPECTED_HASH}, got ${sha256}`);
  }
  console.log('Source hash verified: MATCH');

  const pk = await keytar.getPassword('genlayer-cli', 'account:deployer');
  if (!pk) {
    throw new Error('Failed to retrieve deployer private key from OS keychain.');
  }
  const account = createAccount(pk);
  console.log('Deployer account:', account.address);

  const client = createClient({ chain: studioDevnet, account });
  const balance = await client.getBalance({ address: account.address });
  console.log('Deployer balance:', balance.toString(), 'wei');
  if (BigInt(balance) <= 0n) {
    throw new Error('Deployer balance is zero or insufficient.');
  }

  console.log('Estimating transaction fees...');
  const estimate = await client.estimateTransactionFees();
  console.log('Fee value estimate:', estimate.feeValue.toString());
  console.log('Fee distribution:', JSON.stringify(estimate.distribution, (_k, v) => typeof v === 'bigint' ? v.toString() : v));

  console.log('Submitting deployment transaction to Studio Dev (Chain 61997)...');
  const hash = await client.deployContract({
    code,
    fees: {
      distribution: estimate.distribution,
      messageAllocations: estimate.messageAllocations,
      feeValue: estimate.feeValue,
    },
  });
  console.log('Deployment transaction hash:', hash);

  console.log('Waiting for transaction to be decided...');
  const decided = await client.waitForTransactionReceipt({
    hash,
    waitUntil: 'decided',
    interval: 2000,
    retries: 180,
    fullTransaction: true,
  });
  console.log('Transaction decided status:', decided?.status || 'decided');

  console.log('Waiting for transaction to be finalized...');
  const finalized = await client.waitForTransactionReceipt({
    hash,
    waitUntil: 'finalized',
    interval: 2000,
    retries: 300,
    fullTransaction: true,
  });
  const successful = isSuccessful(finalized);
  console.log('Finalized success:', successful);

  if (!successful) {
    console.error('Finalized receipt details:', JSON.stringify(finalized, null, 2));
    throw new Error(`Deployment failed during execution.`);
  }

  const contractAddress =
    finalized?.data?.contract_address ||
    finalized?.txDataDecoded?.contractAddress ||
    finalized?.contract_address;

  console.log('==============================================');
  console.log('DEPLOYMENT SUCCESSFUL!');
  console.log('Contract Address:', contractAddress);
  console.log('Transaction Hash:', hash);
  console.log('Source SHA-256:', sha256);
  console.log('==============================================');

  if (contractAddress) {
    try {
      const schema = await client.getContractSchema(contractAddress);
      console.log('Authoritative Schema methods count:', Object.keys(schema?.methods || schema || {}).length);
      const deployedCode = await client.getContractCode(contractAddress);
      const deployedHash = crypto.createHash('sha256').update(deployedCode).digest('hex');
      console.log('On-chain code SHA-256:', deployedHash);
      console.log('On-chain hash match:', deployedHash === sha256);
    } catch (err) {
      console.warn('Post-deployment verification warning:', err.message);
    }
  }

  const deploymentRecord = {
    contractAddress,
    transactionHash: hash,
    sourceSha256: sha256,
    deployedAt: new Date().toISOString(),
    network: 'Studio Dev (61997)',
    deployer: account.address,
    receipt: finalized,
  };
  fs.writeFileSync(
    path.resolve(__dirname, 'deployment-candidate-receipt.json'),
    JSON.stringify(deploymentRecord, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2),
    'utf8'
  );
  console.log('Saved deployment record to frontend/scripts/deployment-candidate-receipt.json');
}

main().catch((err) => {
  console.error('DEPLOYMENT FAILED:', err);
  process.exit(1);
});
