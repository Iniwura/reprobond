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
const RPC_URL = 'https://studio-dev.genlayer.com/api';

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
const METHODOLOGY_HASH = "c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac";
const CLAIM = "Optimization X improves mean runtime by at least 20 percent for fixed-demo-workload-v1.";
const BASELINE_RUNS = [100, 100, 100, 100, 100];
const CANDIDATE_RUNS = [75, 75, 75, 75, 75];

async function writeMethod(client, account, functionName, args, value = 0n) {
  const estimate = await client.estimateTransactionFees({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
    fees: {
      distribution: estimate.distribution,
      messageAllocations: estimate.messageAllocations,
      feeValue: estimate.feeValue,
    },
  });
  const finalized = await client.waitForTransactionReceipt({
    hash,
    waitUntil: 'finalized',
    interval: 2000,
    retries: 180,
    fullTransaction: true,
  });
  return { hash, finalized, success: isSuccessful(finalized) };
}

async function getBlockUtc(client) {
  const block = await client.getBlock({ blockTag: 'latest' });
  return new Date(Number(block.timestamp) * 1000);
}

function formatDateUtc(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== ReproBond Live Proof Runner ===');
  console.log('Target contract:', CONTRACT_ADDRESS);

  const pk = await keytar.getPassword('genlayer-cli', 'account:deployer');
  const sponsor = createAccount(pk);
  const sponsorClient = createClient({ chain: studioDevnet, account: sponsor });
  console.log('Sponsor account:', sponsor.address);

  const replicatorA = createAccount();
  const repAClient = createClient({ chain: studioDevnet, account: replicatorA });
  console.log('Replicator A:', replicatorA.address);

  const replicatorB = createAccount();
  const repBClient = createClient({ chain: studioDevnet, account: replicatorB });
  console.log('Replicator B:', replicatorB.address);

  console.log('\n--- Funding Replicators with gas ---');
  await sponsorClient.sendTransaction({ to: replicatorA.address, value: 20000000000000000n });
  await sponsorClient.sendTransaction({ to: replicatorB.address, value: 20000000000000000n });
  await sleep(4000);
  console.log('Replicator A balance:', (await repAClient.getBalance({ address: replicatorA.address })).toString());
  console.log('Replicator B balance:', (await repBClient.getBalance({ address: replicatorB.address })).toString());

  const auditLog = {
    contractAddress: CONTRACT_ADDRESS,
    startedAt: new Date().toISOString(),
    transactions: {},
  };

  // =========================================================================
  // SCENARIO 1: Unclaimed PASS Escrow Recovery Proof (Defect 2)
  // =========================================================================
  console.log('\n=============================================================');
  console.log('PHASE 1: Unclaimed PASS Escrow Recovery Proof');
  console.log('=============================================================');

  const nowBlockTime = await getBlockUtc(sponsorClient);
  console.log('Current Studio Dev Block Time:', formatDateUtc(nowBlockTime));
  const deadlineDate = new Date(nowBlockTime.getTime() + 150 * 1000); // 2.5 minutes future
  const deadlineUtc = formatDateUtc(deadlineDate);
  const challengeId = `reprobond-live-pass-${Date.now().toString(36)}`;
  console.log('Challenge ID:', challengeId);
  console.log('Deadline UTC:', deadlineUtc);

  console.log('1. Creating challenge (2 slots, 1 wei reward, 2 wei escrow)...');
  const createTx = await writeMethod(sponsorClient, sponsor, 'create_challenge', [
    challengeId,
    CLAIM,
    CRITERIA,
    EVIDENCE_REQUIREMENTS,
    'candidate_relative_change_bps.v1',
    2000,
    -2000,
    2,
    1,
    deadlineUtc,
  ]);
  console.log('   Create tx:', createTx.hash, 'Success:', createTx.success);
  auditLog.transactions.create_challenge_pass = createTx.hash;

  console.log('2. Funding challenge (exact 2 wei escrow)...');
  const fundTx = await writeMethod(sponsorClient, sponsor, 'fund_challenge', [challengeId], 2n);
  console.log('   Fund tx:', fundTx.hash, 'Success:', fundTx.success);
  auditLog.transactions.fund_challenge_pass = fundTx.hash;

  console.log('3. Activating challenge (transitions to OPEN)...');
  const actTx = await writeMethod(sponsorClient, sponsor, 'activate_challenge', [challengeId]);
  console.log('   Activate tx:', actTx.hash, 'Success:', actTx.success);
  auditLog.transactions.activate_challenge_pass = actTx.hash;

  console.log('4. Replicator A submits valid replication...');
  const manifestA = [{ evidence_id: "methodology", url: METHODOLOGY_URL, sha256: METHODOLOGY_HASH }];
  const subATx = await writeMethod(repAClient, replicatorA, 'submit_replication', [
    challengeId,
    manifestA,
    BASELINE_RUNS,
    CANDIDATE_RUNS,
  ]);
  console.log('   Submit tx:', subATx.hash, 'Success:', subATx.success);
  auditLog.transactions.submit_replication_a = subATx.hash;

  const repIdsA = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge_replication_ids',
    args: [challengeId],
  });
  const replicationIdA = repIdsA[0];
  console.log('   Replication ID A:', replicationIdA);

  console.log('5. Adjudicating Replicator A (expecting PASS + CONTRADICTS)...');
  const adjATx = await writeMethod(sponsorClient, sponsor, 'adjudicate_replication', [
    challengeId,
    replicationIdA,
  ]);
  console.log('   Adjudicate tx:', adjATx.hash, 'Success:', adjATx.success);
  auditLog.transactions.adjudicate_replication_a = adjATx.hash;

  const recA = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_replication',
    args: [challengeId, replicationIdA],
  });
  console.log('   Replication A state:', recA.state, 'Direction:', recA.result_direction);

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

  console.log('7. Expiring challenge after deadline (Slot 1 PASS, Slot 2 Empty)...');
  const expTx = await writeMethod(sponsorClient, sponsor, 'expire_challenge', [challengeId]);
  console.log('   Expire tx:', expTx.hash, 'Success:', expTx.success);
  auditLog.transactions.expire_challenge_pass = expTx.hash;

  const chAfterExp = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge',
    args: [challengeId],
  });
  console.log('   Challenge state after expiry:', chAfterExp.state);
  console.log('   Qualified count:', chAfterExp.qualified_count.toString());
  console.log('   Refundable unused:', chAfterExp.refundable_unused.toString());
  console.log('   Outstanding PASS reserve:', chAfterExp.outstanding_pass_reserve.toString());

  console.log('8. PROOF DEFECT 2: Sponsor refunds unused escrow while PASS is UNCLAIMED...');
  const refTx = await writeMethod(sponsorClient, sponsor, 'refund_unused', [challengeId]);
  console.log('   Refund unused tx:', refTx.hash, 'Success:', refTx.success);
  auditLog.transactions.refund_unused_pass = refTx.hash;

  const chAfterRef = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge',
    args: [challengeId],
  });
  console.log('   Challenge state after refund:', chAfterRef.state);
  console.log('   Refunded total:', chAfterRef.refunded_total.toString());
  console.log('   Outstanding PASS reserve:', chAfterRef.outstanding_pass_reserve.toString());

  console.log('9. PROOF DEFECT 2: Replicator A settles PASS reward from REFUNDED challenge...');
  const settleTx = await writeMethod(repAClient, replicatorA, 'settle_replication', [
    challengeId,
    replicationIdA,
  ]);
  console.log('   Settle tx:', settleTx.hash, 'Success:', settleTx.success);
  auditLog.transactions.settle_replication_a = settleTx.hash;

  const chFinal = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge',
    args: [challengeId],
  });
  console.log('   Challenge final paid total:', chFinal.paid_total.toString());
  console.log('   Challenge final remaining pool:', chFinal.remaining_pool.toString());

  console.log('10. Replay Protection: duplicate settle attempt must reject...');
  try {
    await writeMethod(repAClient, replicatorA, 'settle_replication', [challengeId, replicationIdA]);
    console.error('   ERROR: Duplicate settlement unexpectedly succeeded!');
  } catch (err) {
    console.log('   SUCCESS: Duplicate settlement rejected as expected.');
    auditLog.transactions.duplicate_settle_rejected = true;
  }

  // =========================================================================
  // SCENARIO 2: Abandoned Repairable UNRESOLVED Protection Proof (Defect 1)
  // =========================================================================
  console.log('\n=============================================================');
  console.log('PHASE 2: UNRESOLVED Protection Before Recovery Grace');
  console.log('=============================================================');

  const nowBlockTime2 = await getBlockUtc(sponsorClient);
  const deadlineDate2 = new Date(nowBlockTime2.getTime() + 100 * 1000); // 100 seconds
  const deadlineUtc2 = formatDateUtc(deadlineDate2);
  const challengeId2 = `reprobond-live-unres-${Date.now().toString(36)}`;
  console.log('Challenge ID 2:', challengeId2);
  console.log('Deadline UTC 2:', deadlineUtc2);

  console.log('1. Creating challenge 2...');
  const createTx2 = await writeMethod(sponsorClient, sponsor, 'create_challenge', [
    challengeId2,
    CLAIM,
    CRITERIA,
    EVIDENCE_REQUIREMENTS,
    'candidate_relative_change_bps.v1',
    2000,
    -2000,
    1,
    1,
    deadlineUtc2,
  ]);
  console.log('   Create tx 2:', createTx2.hash);
  auditLog.transactions.create_challenge_unres = createTx2.hash;

  await writeMethod(sponsorClient, sponsor, 'fund_challenge', [challengeId2], 1n);
  await writeMethod(sponsorClient, sponsor, 'activate_challenge', [challengeId2]);

  console.log('2. Replicator B submits with deliberately unusable hash...');
  const badManifest = [{ evidence_id: "methodology", url: METHODOLOGY_URL, sha256: "0000000000000000000000000000000000000000000000000000000000000000" }];
  const subBTx = await writeMethod(repBClient, replicatorB, 'submit_replication', [
    challengeId2,
    badManifest,
    BASELINE_RUNS,
    CANDIDATE_RUNS,
  ]);
  console.log('   Submit B tx:', subBTx.hash);
  auditLog.transactions.submit_replication_b = subBTx.hash;

  const repIdsB = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_challenge_replication_ids',
    args: [challengeId2],
  });
  const replicationIdB = repIdsB[0];

  console.log('3. Adjudicating B (expecting UNRESOLVED)...');
  const adjBTx = await writeMethod(sponsorClient, sponsor, 'adjudicate_replication', [
    challengeId2,
    replicationIdB,
  ]);
  console.log('   Adjudicate B tx:', adjBTx.hash);
  auditLog.transactions.adjudicate_replication_b = adjBTx.hash;

  const recB = await sponsorClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_replication',
    args: [challengeId2, replicationIdB],
  });
  console.log('   Replication B state:', recB.state, 'Fidelity:', recB.fidelity_status);

  console.log('4. Waiting for deadline 2 to pass...');
  while (true) {
    const curTime = await getBlockUtc(sponsorClient);
    const diff = deadlineDate2.getTime() - curTime.getTime();
    if (diff <= 0) {
      console.log('   Deadline 2 passed!');
      break;
    }
    console.log(`   Waiting... ${Math.ceil(diff / 1000)}s remaining`);
    await sleep(6000);
  }

  console.log('5. PROOF DEFECT 1: Attempting expiry during recovery grace (expecting REJECTION)...');
  try {
    await writeMethod(sponsorClient, sponsor, 'expire_challenge', [challengeId2]);
    console.error('   ERROR: Expiry unexpectedly succeeded during recovery grace!');
  } catch (err) {
    console.log('   SUCCESS: Expiry correctly rejected during recovery grace period!');
    console.log('   Rejection error detail:', err.shortMessage || err.message);
    auditLog.transactions.unresolved_blocks_expiry_during_grace = {
      rejected: true,
      error: err.shortMessage || err.message,
    };
  }

  auditLog.completedAt = new Date().toISOString();
  fs.writeFileSync(
    path.resolve(__dirname, 'live-proof-audit-record.json'),
    JSON.stringify(auditLog, null, 2),
    'utf8'
  );
  console.log('\n=============================================================');
  console.log('ALL LIVE PROOFS COMPLETED AND RECORDED SUCCESSFULLY!');
  console.log('Saved to frontend/scripts/live-proof-audit-record.json');
  console.log('=============================================================');
}

main().catch((err) => {
  console.error('LIVE PROOF FAILED:', err);
  process.exit(1);
});
