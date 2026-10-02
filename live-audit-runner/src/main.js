import { createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const CONTRACT = "0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc";
const CHALLENGE_ID = "reprobond-corrected-20261001-a";
const SPONSOR = "0xa35dc047f9937bf668743efbdf8ea93b31a55888";
const REPLICATOR = "0xd0dd02322AF812fC0dbDdC69f9a055FBBe2C6673";
const CHAIN_ID = studioDevnet.id;
const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);
const DEPLOYED_SOURCE_SHA256 = "0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc";
const REPLICATION_ID = "d3dfda779724b60dacba75d35ba1ec260c0f82898facc9a610e404452606f5e4";
const REPLICATION_ID_CANONICAL = "[\"REPROBOND-REPLICATION-ID-V1\",[\"reprobond-corrected-20261001-a\",\"0xd0dd02322af812fc0dbddc69f9a055fbbe2c6673\",1]]";
const METHODOLOGY_URL = "https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md";
const METHODOLOGY_HASH = "c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac";
const MANIFEST = Object.freeze([{ evidence_id: "methodology", url: METHODOLOGY_URL, sha256: METHODOLOGY_HASH }]);
const BASELINE_RUNS = Object.freeze([100, 100, 100, 100, 100]);
const CANDIDATE_RUNS = Object.freeze([75, 75, 75, 75, 75]);
const REWARD = 1000000000000n;
const ZERO_VALUE = 0n;
const readClient = createClient({ chain: studioDevnet });
const STORAGE_KEY = "reprobond.live-audit.v3";

let provider = null;
let account = null;
let writeClient = null;
let snapshot = { challenge: null, replication: null, replicationIds: [], balances: null };
let busy = false;
let audit = loadAudit();

const $ = (id) => document.getElementById(id);

function replacer(_, value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}
function safe(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Map) return Object.fromEntries(item);
    if (item && typeof item === "object") {
      if (seen.has(item)) return "[Circular]";
      seen.add(item);
    }
    return item;
  }, 2);
}
function loadAudit() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveAudit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(audit, replacer));
}
function serializeError(value, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined || typeof value !== "object") return value;
  if (depth > 7 || seen.has(value)) return depth > 7 ? "[MaxDepth]" : "[Circular]";
  seen.add(value);
  const out = {};
  const keys = new Set(["name", "message", "code", "shortMessage", "details", "stack", "data", "cause", ...Object.keys(value), ...Object.getOwnPropertyNames(value)]);
  for (const key of keys) {
    try { if (key in value) out[key] = serializeError(value[key], seen, depth + 1); }
    catch { out[key] = "[Unserializable]"; }
  }
  return out;
}
function log(label, value) {
  $("log").textContent += new Date().toISOString() + " " + label + (value === undefined ? "" : "\n" + safe(value)) + "\n\n";
  console.log(label, value);
}
function setStatus(value, className = "") {
  $("status").textContent = value;
  $("status").className = className;
}
function setText(id, value) { $(id).textContent = typeof value === "string" ? value : safe(value); }
function lower(value) { return String(value ?? "").toLowerCase(); }
function sameAddress(a, b) { return lower(a) === lower(b); }
function asBigInt(value) { return BigInt(String(value ?? 0)); }
function setBusy(value) {
  busy = value;
  $("connect").disabled = value;
  $("refresh").disabled = value;
  updateButtons();
}
function selectedProvider() {
  const injected = window.ethereum;
  const providers = Array.isArray(injected && injected.providers)
    ? injected.providers.filter(Boolean)
    : (injected ? [injected] : []);
  const selected = providers.find((item) => item.isRabby || item._isRabby)
    || providers.find((item) => item.isMetaMask)
    || providers[0];
  return { injected, providers, selected };
}
async function request(label, method, params = []) {
  log("WALLET_REQUEST: " + label, { method, params });
  try {
    const result = await provider.request({ method, params });
    log("WALLET_RESPONSE: " + label, { method, result });
    return result;
  } catch (error) {
    log("WALLET_ERROR: " + label, { method, error: serializeError(error) });
    throw error;
  }
}
async function ensureStudioChain() {
  const current = String(await request("eth_chainId", "eth_chainId")).toLowerCase();
  if (current === CHAIN_HEX) return;
  try {
    await request("wallet_switchEthereumChain", "wallet_switchEthereumChain", [{ chainId: CHAIN_HEX }]);
  } catch (error) {
    const detail = serializeError(error);
    const code = detail && (detail.code || (detail.data && detail.data.originalError && detail.data.originalError.code));
    if (code !== 4902 && code !== "4902") throw error;
    await request("wallet_addEthereumChain", "wallet_addEthereumChain", [{
      chainId: CHAIN_HEX,
      chainName: studioDevnet.name,
      nativeCurrency: studioDevnet.nativeCurrency,
      rpcUrls: studioDevnet.rpcUrls.default.http,
    }]);
    await request("wallet_switchEthereumChain after add", "wallet_switchEthereumChain", [{ chainId: CHAIN_HEX }]);
  }
  const verified = String(await request("eth_chainId after switch", "eth_chainId")).toLowerCase();
  if (verified !== CHAIN_HEX) throw new Error("Wallet remains on the wrong network; Studio Dev chain 61997 is required.");
}
function attachProviderEvents() {
  if (!provider || typeof provider.on !== "function") return;
  provider.on("accountsChanged", async (accounts) => {
    account = accounts?.[0] || null;
    writeClient = account ? createClient({ chain: studioDevnet, account, provider }) : null;
    setText("wallet", account || "not connected");
    log("WALLET_ACCOUNTS_CHANGED", { account });
    try { await refreshAuthoritative("accounts changed"); }
    catch (error) { log("REFRESH_ERROR: accounts changed", serializeError(error)); }
  });
  provider.on("chainChanged", async (chain) => {
    setText("chain", chain);
    log("WALLET_CHAIN_CHANGED", { chain });
    try { await refreshAuthoritative("chain changed"); }
    catch (error) { log("REFRESH_ERROR: chain changed", serializeError(error)); }
  });
}
async function connectWallet() {
  const selected = selectedProvider();
  log("INJECTED_PROVIDER_SELECTION", {
    providerVisible: Boolean(selected.injected),
    providerCount: selected.providers.length,
    selectedIsRabby: Boolean(selected.selected && (selected.selected.isRabby || selected.selected._isRabby)),
    selectedIsMetaMask: Boolean(selected.selected && selected.selected.isMetaMask),
  });
  if (!selected.selected || typeof selected.selected.request !== "function") {
    throw new Error("No injected EIP-1193 wallet provider found.");
  }
  provider = selected.selected;
  attachProviderEvents();
  await request("eth_requestAccounts", "eth_requestAccounts");
  await ensureStudioChain();
  account = (await request("eth_accounts", "eth_accounts"))?.[0] || null;
  if (!account) throw new Error("Wallet did not return an account.");
  writeClient = createClient({ chain: studioDevnet, account, provider });
  setText("wallet", account);
  setText("chain", CHAIN_ID + " (" + CHAIN_HEX + ")");
  log("WALLET_CONNECTED", { account, chain: CHAIN_ID });
  await refreshAuthoritative("wallet connected");
}
async function readChallenge() {
  return readClient.readContract({
    address: CONTRACT,
    functionName: "get_challenge",
    args: [CHALLENGE_ID],
    jsonSafeReturn: true,
    transactionHashVariant: "latest-nonfinal",
  });
}
async function readReplicationIds() {
  return readClient.readContract({
    address: CONTRACT,
    functionName: "get_challenge_replication_ids",
    args: [CHALLENGE_ID],
    jsonSafeReturn: true,
    transactionHashVariant: "latest-nonfinal",
  });
}
async function readReplication() {
  return readClient.readContract({
    address: CONTRACT,
    functionName: "get_replication",
    args: [CHALLENGE_ID, REPLICATION_ID],
    jsonSafeReturn: true,
    transactionHashVariant: "latest-nonfinal",
  });
}
async function readBalances() {
  return {
    contract: (await readClient.getBalance({ address: CONTRACT, blockTag: "latest" })).toString(),
    sponsor: (await readClient.getBalance({ address: SPONSOR, blockTag: "latest" })).toString(),
    replicator: (await readClient.getBalance({ address: REPLICATOR, blockTag: "latest" })).toString(),
  };
}
async function refreshAuthoritative(label = "manual refresh") {
  const challenge = await readChallenge();
  const replicationIds = await readReplicationIds();
  const hasReplication = Array.isArray(replicationIds) && replicationIds.map(String).some((id) => id.toLowerCase() === REPLICATION_ID);
  const replication = hasReplication ? await readReplication() : null;
  const balances = await readBalances();
  snapshot = { challenge, replication, replicationIds, balances };
  setText("challenge", { label, challenge });
  setText("replication", { label, derivedReplicationId: REPLICATION_ID, replicationIds, replication });
  setText("balances", { label, balances, remainingPool: challenge ? asBigInt(challenge.escrow_funded) - asBigInt(challenge.paid_total) : null });
  log("AUTHORITATIVE_STATE_READ", { label, ...snapshot });
  updatePlan();
  updateButtons();
  return snapshot;
}
function manifestMatches() {
  return JSON.stringify(MANIFEST) === JSON.stringify([{ evidence_id: "methodology", url: METHODOLOGY_URL, sha256: METHODOLOGY_HASH }]);
}
function arraysMatch() {
  return JSON.stringify(BASELINE_RUNS) === JSON.stringify([100, 100, 100, 100, 100])
    && JSON.stringify(CANDIDATE_RUNS) === JSON.stringify([75, 75, 75, 75, 75]);
}
function configSummary() {
  return {
    contract: CONTRACT,
    challenge: CHALLENGE_ID,
    replicator: REPLICATOR,
    replicationId: REPLICATION_ID,
    evidence: MANIFEST,
    baselineRuns: BASELINE_RUNS,
    candidateRuns: CANDIDATE_RUNS,
    sourceSha256: DEPLOYED_SOURCE_SHA256,
  };
}
function updatePlan() {
  const state = snapshot.challenge?.state || "unknown";
  const repState = snapshot.replication?.state || "not submitted";
  const role = account
    ? (sameAddress(account, SPONSOR) ? "SPONSOR" : sameAddress(account, REPLICATOR) ? "REPLICATOR" : "OTHER")
    : "NOT CONNECTED";
  setText("instructions", {
    currentWallet: account || "not connected",
    currentRole: role,
    next: state === "FUNDED" ? "Connect sponsor and activate."
      : state === "OPEN" && !snapshot.replication ? "Switch to the replicator wallet and submit."
      : repState === "SUBMITTED" ? "Adjudication may be called by any connected wallet."
      : repState === "PASS" ? "Switch to the replicator wallet and settle."
      : repState === "PAID" ? "Keep the replicator wallet connected and attempt replay."
      : "Refresh authoritative state.",
    walletRules: {
      activation: "sponsor only",
      submission: "replicator only; sponsor rejected",
      adjudication: "any caller permitted by deployed source",
      settlement: "stored replicator only",
      replay: "stored replicator only",
    },
  });
  setText("replicationId", REPLICATION_ID);
}
function updateButtons() {
  const challenge = snapshot.challenge;
  const replication = snapshot.replication;
  const connected = Boolean(account && writeClient && provider);
  const sponsor = connected && sameAddress(account, SPONSOR);
  const replicator = connected && sameAddress(account, REPLICATOR);
  $("activate").disabled = busy || !challenge || challenge.state !== "FUNDED" || asBigInt(challenge.escrow_funded) !== 3000000000000n || !sponsor;
  $("submit").disabled = busy || !challenge || challenge.state !== "OPEN" || Boolean(replication) || !replicator;
  $("adjudicate").disabled = busy || !challenge || !replication || replication.state !== "SUBMITTED" || !connected;
  $("settle").disabled = busy || !challenge || !replication || replication.state !== "PASS" || !replicator;
  $("replay").disabled = busy || !challenge || !replication || replication.state !== "PAID" || !replicator || Boolean(audit.replay?.rejected);
}
async function assertAccountChain(expected, role) {
  const chain = String(await request("eth_chainId before " + role, "eth_chainId")).toLowerCase();
  if (chain !== CHAIN_HEX) throw new Error("Studio Dev chain 61997 is required.");
  const current = (await request("eth_accounts before " + role, "eth_accounts"))?.[0];
  if (!current || !sameAddress(current, expected)) throw new Error("Switch Rabby to " + role + " wallet " + expected + " before signing.");
  account = current;
  writeClient = createClient({ chain: studioDevnet, account, provider });
}
function assertChallenge(expectedState) {
  if (!snapshot.challenge || snapshot.challenge.state !== expectedState) {
    throw new Error("Challenge must be " + expectedState + "; authoritative state is " + String(snapshot.challenge?.state));
  }
  if (!sameAddress(snapshot.challenge.sponsor, SPONSOR)) throw new Error("Stored sponsor does not match configured sponsor.");
}
function assertManifestPacket() {
  if (!manifestMatches()) throw new Error("Frozen methodology manifest does not match the corrected preflight.");
  if (!arraysMatch()) throw new Error("Frozen raw arrays do not match the corrected preflight.");
}
async function estimateWrite(method, args) {
  if (!writeClient) throw new Error("Connect the required wallet first.");
  return writeClient.estimateTransactionFeesForWrite({
    address: CONTRACT,
    functionName: method,
    args,
    value: ZERO_VALUE,
  });
}
function txStatus(tx) {
  return {
    hash: tx?.hash || tx?.tx_id || tx?.transactionId,
    status: tx?.statusName || tx?.status,
    execution: tx?.txExecutionResultName || tx?.execution,
    consensus: tx?.result_name || tx?.consensus,
    lifecycle: tx?.lifecycle,
  };
}
async function sendAndFinalize(label, method, args, expectedSuccess = true) {
  const estimate = await estimateWrite(method, args);
  const feeValue = BigInt(estimate.feeValue);
  const preSign = {
    sdkVersion: "genlayer-js 2.0.0-rc.1",
    contract: CONTRACT,
    method,
    args,
    userValue: ZERO_VALUE,
    feeValue,
    totalEnvelope: feeValue,
    feeDistribution: estimate.distribution,
    connectedAccount: account,
    chain: CHAIN_ID,
    expectedSuccess,
  };
  log("PRE_SIGN_TRANSACTION", preSign);
  const hash = await writeClient.writeContract({
    address: CONTRACT,
    functionName: method,
    args,
    value: ZERO_VALUE,
    fees: {
      distribution: estimate.distribution,
      messageAllocations: estimate.messageAllocations,
      feeValue: estimate.feeValue,
    },
  });
  audit.transactions = audit.transactions || {};
  audit.transactions[label] = hash;
  saveAudit();
  log("GENLAYER_TRANSACTION_SUBMITTED", { label, transactionId: hash });
  setStatus(label + " submitted; waiting for decision...", "warning");
  const decided = await writeClient.waitForTransactionReceipt({
    hash, waitUntil: "decided", interval: 2500, retries: 120, fullTransaction: true,
  });
  log("GENLAYER_DECIDED: " + label, txStatus(decided));
  const finalized = await writeClient.waitForTransactionReceipt({
    hash, waitUntil: "finalized", interval: 2500, retries: 240, fullTransaction: true,
  });
  const success = isSuccessful(finalized);
  log("GENLAYER_FINALIZED: " + label, { success, ...txStatus(finalized) });
  if (expectedSuccess && !success) {
    throw new Error(label + " finalized unsuccessfully: " + safe(txStatus(finalized)));
  }
  if (!expectedSuccess && success) {
    throw new Error(label + " unexpectedly succeeded.");
  }
  return { hash, estimate, decided, finalized, success };
}
function actualFeeFromTransaction(tx) {
  const candidates = [
    tx?.data?.fee_accounting?.primary_fee_spent,
    tx?.fee_accounting?.primary_fee_spent,
    tx?.fees?.consumed?.executionConsumed,
    tx?.fees?.consumed?.execution_consumed,
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null) return BigInt(String(value));
  }
  return null;
}
async function finalizedTransaction(hash) {
  return readClient.getTransaction({ hash, fullTransaction: true });
}
async function activate() {
  setBusy(true);
  try {
    await refreshAuthoritative("before activation");
    assertChallenge("FUNDED");
    if (asBigInt(snapshot.challenge.escrow_funded) !== 3000000000000n) throw new Error("Exact 3 GEN escrow is required.");
    await assertAccountChain(SPONSOR, "sponsor");
    const result = await sendAndFinalize("activation", "activate_challenge", [CHALLENGE_ID]);
    audit.activation = { hash: result.hash, status: txStatus(result.finalized) };
    await refreshAuthoritative("after activation");
    if (snapshot.challenge.state !== "OPEN") throw new Error("Activation finalized but challenge is not OPEN.");
    saveAudit();
    setStatus("activation proven; switch to replicator for submission", "ok");
  } finally { setBusy(false); updateButtons(); }
}
async function submitReplication() {
  setBusy(true);
  try {
    await refreshAuthoritative("before submission");
    assertChallenge("OPEN");
    if (snapshot.replicationIds.length !== 0) throw new Error("Challenge already has replication records; refusing duplicate live submission.");
    assertManifestPacket();
    await assertAccountChain(REPLICATOR, "replicator");
    const args = [CHALLENGE_ID, MANIFEST, BASELINE_RUNS, CANDIDATE_RUNS];
    const result = await sendAndFinalize("submission", "submit_replication", args);
    await refreshAuthoritative("after submission");
    if (!snapshot.replication || snapshot.replication.state !== "SUBMITTED") throw new Error("Submission finalized but replication is not SUBMITTED.");
    if (!sameAddress(snapshot.replication.replicator, REPLICATOR)) throw new Error("Stored replicator mismatch.");
    if (snapshot.replication.revision !== 1) throw new Error("Unexpected replication revision.");
    audit.submission = { hash: result.hash, replicationId: REPLICATION_ID, manifest: MANIFEST, baselineRuns: BASELINE_RUNS, candidateRuns: CANDIDATE_RUNS };
    saveAudit();
    setStatus("submission proven; adjudication may use any connected wallet", "ok");
  } finally { setBusy(false); updateButtons(); }
}
function verifyRequiredResult() {
  const replication = snapshot.replication;
  const criteria = Array.isArray(replication?.criteria) ? replication.criteria : [];
  const statuses = new Map(criteria.map((item) => [item.criterion_id, item.status]));
  const required = ["environment", "trial_count", "analysis_method", "correctness_check"];
  if (replication?.state !== "PASS" || replication?.fidelity_status !== "PASS") return false;
  if (String(replication.relative_change_bps) !== "-2500") return false;
  if (replication.result_direction !== "CONTRADICTS") return false;
  return required.every((id) => statuses.get(id) === "SATISFIED");
}
async function adjudicate() {
  setBusy(true);
  try {
    await refreshAuthoritative("before adjudication");
    assertChallenge("OPEN");
    if (!snapshot.replication || snapshot.replication.state !== "SUBMITTED") throw new Error("Replication must be SUBMITTED.");
    if (!account) throw new Error("Connect any wallet; deployed adjudication has no caller restriction.");
    const result = await sendAndFinalize("adjudication", "adjudicate_replication", [CHALLENGE_ID, REPLICATION_ID]);
    await refreshAuthoritative("after adjudication");
    audit.adjudication = { hash: result.hash, status: txStatus(result.finalized), replication: snapshot.replication };
    saveAudit();
    if (!verifyRequiredResult()) {
      setStatus("BLOCKED: authoritative result is not PASS + -2500 + CONTRADICTS; settlement disabled", "bad");
      throw new Error("Required live outcome did not materialize: " + safe(snapshot.replication));
    }
    setStatus("PASS + -2500 bps + CONTRADICTS proven; switch to replicator for settlement", "ok");
  } finally { setBusy(false); updateButtons(); }
}
async function settle() {
  setBusy(true);
  try {
    await refreshAuthoritative("before settlement");
    if (!verifyRequiredResult()) throw new Error("Settlement requires authoritative PASS + -2500 + CONTRADICTS.");
    await assertAccountChain(REPLICATOR, "replicator");
    const before = { balances: snapshot.balances, challenge: snapshot.challenge, replication: snapshot.replication };
    audit.beforeSettlement = before;
    saveAudit();
    const result = await sendAndFinalize("settlement", "settle_replication", [CHALLENGE_ID, REPLICATION_ID]);
    const tx = await finalizedTransaction(result.hash);
    const feePaid = actualFeeFromTransaction(tx);
    await refreshAuthoritative("after settlement");
    const after = { balances: snapshot.balances, challenge: snapshot.challenge, replication: snapshot.replication };
    const grossTransfer = asBigInt(before.balances.contract) - asBigInt(after.balances.contract);
    const netReplicatorChange = asBigInt(after.balances.replicator) - asBigInt(before.balances.replicator);
    const expectedNet = feePaid === null ? null : REWARD - feePaid;
    const payoutVerified = snapshot.replication.state === "PAID"
      && grossTransfer === REWARD
      && asBigInt(after.challenge.paid_total) === REWARD
      && (expectedNet === null || netReplicatorChange === expectedNet);
    audit.settlement = {
      hash: result.hash,
      status: txStatus(result.finalized),
      feePaidWei: feePaid?.toString() ?? null,
      before,
      after,
      grossTransferWei: grossTransfer.toString(),
      netReplicatorChangeWei: netReplicatorChange.toString(),
      expectedNetReplicatorChangeWei: expectedNet?.toString() ?? null,
      payoutVerified,
    };
    saveAudit();
    if (!payoutVerified) throw new Error("Settlement finalized but native payout accounting was not fully verified: " + safe(audit.settlement));
    setStatus("native payout proven; keep replicator connected for replay attempt", "ok");
  } finally { setBusy(false); updateButtons(); }
}
async function replaySettlement() {
  setBusy(true);
  try {
    await refreshAuthoritative("before replay");
    if (snapshot.replication?.state !== "PAID") throw new Error("Replay requires replication state PAID.");
    await assertAccountChain(REPLICATOR, "replicator");
    const before = { balances: snapshot.balances, challenge: snapshot.challenge, replication: snapshot.replication };
    let result;
    try {
      result = await sendAndFinalize("replay", "settle_replication", [CHALLENGE_ID, REPLICATION_ID], false);
    } catch (error) {
      audit.replay = { rejected: false, noFinalizedProof: true, error: serializeError(error) };
      saveAudit();
      throw error;
    }
    await refreshAuthoritative("after replay");
    const balancesUnchanged = JSON.stringify(before.balances) === JSON.stringify(snapshot.balances);
    const stateUnchanged = snapshot.replication?.state === "PAID";
    audit.replay = {
      rejected: !result.success,
      hash: result.hash,
      status: txStatus(result.finalized),
      balancesUnchanged,
      stateUnchanged,
      error: result.success ? "unexpected success" : null,
    };
    saveAudit();
    if (result.success || !balancesUnchanged || !stateUnchanged) {
      throw new Error("Replay was not proven rejected without state/payout change: " + safe(audit.replay));
    }
    setStatus("duplicate settlement rejected; no second payout; live audit complete", "ok");
  } finally { setBusy(false); updateButtons(); }
}
$("connect").addEventListener("click", () => connectWallet().catch((error) => {
  log("ACTION_ERROR: connect", serializeError(error));
  setStatus("connect failed; see log", "bad");
}));
$("refresh").addEventListener("click", () => refreshAuthoritative("manual refresh").catch((error) => {
  log("ACTION_ERROR: refresh", serializeError(error));
  setStatus("refresh failed; see log", "bad");
}));
$("activate").addEventListener("click", () => activate().catch((error) => {
  log("ACTION_ERROR: activation", serializeError(error));
  setStatus("activation failed; see log", "bad");
}));
$("submit").addEventListener("click", () => submitReplication().catch((error) => {
  log("ACTION_ERROR: submission", serializeError(error));
  setStatus("submission failed; see log", "bad");
}));
$("adjudicate").addEventListener("click", () => adjudicate().catch((error) => {
  log("ACTION_ERROR: adjudication", serializeError(error));
  if (!$("status").textContent.startsWith("BLOCKED")) setStatus("adjudication failed; see log", "bad");
}));
$("settle").addEventListener("click", () => settle().catch((error) => {
  log("ACTION_ERROR: settlement", serializeError(error));
  setStatus("settlement failed; see log", "bad");
}));
$("replay").addEventListener("click", () => replaySettlement().catch((error) => {
  log("ACTION_ERROR: replay", serializeError(error));
  setStatus("replay failed; see log", "bad");
}));
setText("config", configSummary());
updatePlan();
updateButtons();
