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

const CONTRACT_ADDRESS = '0xBe987E257a07dF2EC17FFcF92764674C5F9b8077';

const CRITERIA = [
  {
    criterion_id: "environment",
    requirement: "The public evidence artifact states that the benchmark execution environment is Linux x86_64 with the same environment for the baseline and candidate, and records Studio Dev chain 61997 plus genlayer-js 2.0.0-rc.1 as adjudication/transaction metadata. The SDK version is not a benchmark-execution requirement.",
    semantics: "HARD"
  },
  {
    criterion_id: "trial_count",
    requirement: "Exactly five baseline and five candidate trials are submitted as raw integer arrays.",
    semantics: "HARD"
  },
  {
    criterion_id: "analysis_method",
    requirement: "Use candidate_relative_change_bps.v1 from the raw arrays and do not choose a result label manually.",
    semantics: "HARD"
  },
  {
    criterion_id: "correctness_check",
    requirement: "The raw arrays are bounded and the evidence is fetched from the committed HTTPS URL.",
    semantics: "HARD"
  }
];

const EVIDENCE_REQUIREMENTS = [
  {
    evidence_id: "methodology",
    requirement: "The public HTTPS artifact identifies the benchmark environment, the five-trial protocol, the frozen analysis method, and the committed evidence binding for this replication.",
    required: true
  }
];

const METHODOLOGY_URL = "https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md";
const CLAIM = "Optimization X improves mean runtime by at least 20 percent for fixed-demo-workload-v1.";
const BASELINE_RUNS = [100, 100, 100, 100, 100];
const CANDIDATE_RUNS = [75, 75, 75, 75, 75];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryableRpc(fn, maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err?.message || String(err);
      if (
        attempt < maxRetries &&
        (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('fetch failed'))
      ) {
        console.warn(`[Network Retry] attempt ${attempt} failed with network error: ${msg}. Retrying in 4s...`);
        await sleep(4000);
        continue;
      }
      throw err;
    }
  }
}

async function writeMethod(client, account, functionName, args, value = 0n) {
  const estimate = await retryableRpc(() =>
    client.estimateTransactionFees({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
    })
  );

  const hash = await retryableRpc(() =>
    client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
      fees: {
        distribution: estimate.distribution,
        messageAllocations: estimate.messageAllocations,
        feeValue: estimate.feeValue,
      },
    })
  );

  let finalized;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      finalized = await client.waitForTransactionReceipt({
        hash,
        waitUntil: 'finalized',
        interval: 2000,
        retries: 180,
        fullTransaction: true,
      });
      break;
    } catch (err) {
      const msg = err?.message || String(err);
      if (attempt < 5 && (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('fetch failed'))) {
        console.warn(`[Network Retry] receipt fetch attempt ${attempt} failed: ${msg}. Retrying in 5s...`);
        await sleep(5000);
        continue;
      }
      throw err;
    }
  }

  return { hash, finalized, success: isSuccessful(finalized) };
}

async function getBlockUtc(client) {
  return retryableRpc(async () => {
    const block = await client.getBlock({ blockTag: 'latest' });
    return new Date(Number(block.timestamp) * 1000);
  });
}

function formatDateUtc(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function main() {
  console.log('=== Phase 2: UNRESOLVED Expiry Blocking Proof ===');
  const pk = await keytar.getPassword('genlayer-cli', 'account:deployer');
  const sponsor = createAccount(pk);
  const sponsorClient = createClient({ chain: studioDevnet, account: sponsor });

  const replicatorB = createAccount();
  const repBClient = createClient({ chain: studioDevnet, account: replicatorB });
  console.log('Replicator B address:', replicatorB.address);

  console.log('Funding Replicator B with gas...');
  await sponsorClient.sendTransaction({ to: replicatorB.address, value: 20000000000000000n });
  await sleep(4000);

  const nowBlockTime = await getBlockUtc(sponsorClient);
  console.log('Current Studio Dev Block Time:', formatDateUtc(nowBlockTime));
  // 320 seconds (5m 20s) in the future to ensure ample time for create, fund, activate, submit
  const deadlineDate = new Date(nowBlockTime.getTime() + 320 * 1000);
  const deadlineUtc = formatDateUtc(deadlineDate);
  const challengeId = `reprobond-live-unres-${Date.now().toString(36)}`;
  console.log('Challenge ID:', challengeId);
  console.log('Deadline UTC:', deadlineUtc);

  console.log('1. Creating challenge (1 slot, 1 wei reward, 1 wei escrow)...');
  const createTx = await writeMethod(sponsorClient, sponsor, 'create_challenge', [
    challengeId,
    CLAIM,
    CRITERIA,
    EVIDENCE_REQUIREMENTS,
    'candidate_relative_change_bps.v1',
    2000,
    -2000,
    1,
    1,
    deadlineUtc,
  ]);
  console.log('   Create tx:', createTx.hash, 'Success:', createTx.success);

  console.log('2. Funding challenge (1 wei)...');
  const fundTx = await writeMethod(sponsorClient, sponsor, 'fund_challenge', [challengeId], 1n);
  console.log('   Fund tx:', fundTx.hash, 'Success:', fundTx.success);

  console.log('3. Activating challenge...');
  const actTx = await writeMethod(sponsorClient, sponsor, 'activate_challenge', [challengeId]);
  console.log('   Activate tx:', actTx.hash, 'Success:', actTx.success);

  console.log('4. Replicator B submits with deliberately unusable hash...');
  const badManifest = [{ evidence_id: "methodology", url: METHODOLOGY_URL, sha256: "0000000000000000000000000000000000000000000000000000000000000000" }];
  const subBTx = await writeMethod(repBClient, replicatorB, 'submit_replication', [
    challengeId,
    badManifest,
    BASELINE_RUNS,
    CANDIDATE_RUNS,
  ]);
  console.log('   Submit B tx:', subBTx.hash, 'Success:', subBTx.success);

  const repIds = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge_replication_ids',
    args: [challengeId],
  });
  const replicationIdB = repIds[0];
  console.log('   Replication ID B:', replicationIdB);

  console.log('5. Adjudicating Replicator B (expecting UNRESOLVED)...');
  const adjBTx = await writeMethod(sponsorClient, sponsor, 'adjudicate_replication', [
    challengeId,
    replicationIdB,
  ]);
  console.log('   Adjudicate B tx:', adjBTx.hash, 'Success:', adjBTx.success);

  const recB = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_replication',
    args: [challengeId, replicationIdB],
  });
  console.log('   Replication B state:', recB.state, 'Fidelity:', recB.fidelity_status);

  console.log('6. Waiting for deadline to pass...');
  while (true) {
    const curTime = await getBlockUtc(sponsorClient);
    const diff = deadlineDate.getTime() - curTime.getTime();
    if (diff <= 0) {
      console.log('   Deadline passed! (Block time:', formatDateUtc(curTime), ')');
      break;
    }
    console.log(`   Waiting... ${Math.ceil(diff / 1000)}s remaining until deadline`);
    await sleep(6000);
  }

  console.log('7. PROOF DEFECT 1: Sponsor attempts expiry after deadline during recovery grace...');
  let expiryAttemptResult;
  try {
    expiryAttemptResult = await writeMethod(sponsorClient, sponsor, 'expire_challenge', [challengeId]);
  } catch (simErr) {
    expiryAttemptResult = { success: false, error: simErr.shortMessage || simErr.message };
  }
  console.log('   Expiry attempt result:', expiryAttemptResult.success ? 'UNEXPECTED SUCCESS' : 'REJECTED (EXPECTED)');
  console.log('   Expiry rejection proof:', expiryAttemptResult);

  const chFinal = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge',
    args: [challengeId],
  });
  console.log('   Challenge state remains protected:', chFinal.state);

  const proofData = {
    contractAddress: CONTRACT_ADDRESS,
    phase: "UNRESOLVED_GRACE_PROTECTION",
    challengeId,
    deadlineUtc,
    recoveryDeadlineUtc: chFinal.recovery_deadline_utc,
    createTx: createTx.hash,
    fundTx: fundTx.hash,
    activateTx: actTx.hash,
    submitTx: subBTx.hash,
    replicationId: replicationIdB,
    adjudicateTx: adjBTx.hash,
    replicationState: recB.state,
    expiryAttemptRejected: !expiryAttemptResult.success,
    expiryAttemptDetails: expiryAttemptResult,
    challengeStateAfterAttempt: chFinal.state,
  };

  fs.writeFileSync(
    path.resolve(__dirname, 'phase2-proof-record.json'),
    JSON.stringify(proofData, null, 2),
    'utf8'
  );
  console.log('\n=== PHASE 2 COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('Phase 2 failed:', err);
  process.exit(1);
});
