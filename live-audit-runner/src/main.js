import { createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const CONTRACT = "0x897a7dF67E638506557985FE795Ff2F762f01607";
const CHALLENGE_ID = "reprobond-steward-20261007-a";
const SPONSOR = "0xa35dc047f9937bf668743efbdf8ea93b31a55888";
const REPLICATOR = "0xd0dd02322AF812fC0dbDdC69f9a055FBBe2C6673";
const CHAIN_ID = studioDevnet.id;
const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);
const DEPLOYED_SOURCE_SHA256 = "5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b";
const REPLICATION_ID = "8432507f735155e812f7b4fba27177a765c0199fe3f788a9c8cfada9e31b3831";
const REPLICATION_ID_CANONICAL = "[\"REPROBOND-REPLICATION-ID-V1\",[ \"reprobond-steward-20261007-a\",\"0xd0dd02322af812fc0dbddc69f9a055fbbe2c6673\",1]]";
const CLAIM = "Optimization X improves mean runtime by at least 20 percent for fixed-demo-workload-v1.";
const DEADLINE_UTC = "2026-11-07T00:00:00Z";
const CRITERIA = Object.freeze([
  { criterion_id: "environment", requirement: "The public evidence artifact states that the benchmark execution environment is Linux x86_64 with the same environment for the baseline and candidate, and records Studio Dev chain 61997 plus genlayer-js 2.0.0-rc.1 as adjudication/transaction metadata. The SDK version is not a benchmark-execution requirement.", semantics: "HARD" },
  { criterion_id: "trial_count", requirement: "Exactly five baseline and five candidate trials are submitted as raw integer arrays.", semantics: "HARD" },
  { criterion_id: "analysis_method", requirement: "Use candidate_relative_change_bps.v1 from the raw arrays and do not choose a result label manually.", semantics: "HARD" },
  { criterion_id: "correctness_check", requirement: "The raw arrays are bounded and the evidence is fetched from the committed HTTPS URL.", semantics: "HARD" },
]);
const EVIDENCE_REQUIREMENTS = Object.freeze([
  { evidence_id: "methodology", requirement: "The public HTTPS artifact identifies the benchmark environment, the five-trial protocol, the frozen analysis method, and the committed evidence binding for this replication.", required: true },
]);
const METHODOLOGY_URL = "https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md";
const METHODOLOGY_HASH = "c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac";
const MANIFEST = Object.freeze([{ evidence_id: "methodology", url: METHODOLOGY_URL, sha256: METHODOLOGY_HASH }]);
const BASELINE_RUNS = Object.freeze([100, 100, 100, 100, 100]);
const CANDIDATE_RUNS = Object.freeze([75, 75, 75, 75, 75]);
const REWARD = 1000000000000n;
const SHORT_SCENARIO_ID = "reprobond-steward-consolidated-20261007-b";
const SHORT_SCENARIO_REWARD = 1n;
const SHORT_SCENARIO_ESCROW = 2n;
const SHORT_SCENARIO_REPLICATION_ID = "e7de30481ab0395935d39da02f39be5f748a24fb8fb4a329470d4dc51ceca11e";
const SHORT_SCENARIO_STUDIO_TIME_AT_PREP = "2026-10-07T21:54:08Z";
const SHORT_SCENARIO_TARGET_DEADLINE_AT_PREP = "2026-10-07T22:39:08Z";
const SHORT_SCENARIO_CREATED_TX = "0x62f7764e3638db74145a2337c8a6cd0921917e9cc6a79b92d8df9a1da3d5dd7";

// Keep the static scenario copy in index.html aligned with the active, authoritative
// scenario constants when the runner is refreshed after a scenario replacement.
function syncStaticScenarioLabels() {
  const replacements = [
    ["reprobond-steward-consolidated-20261007-a", SHORT_SCENARIO_ID],
    ["2026-10-07T21:24:17Z", SHORT_SCENARIO_STUDIO_TIME_AT_PREP],
    ["2026-10-07T22:04:17Z", SHORT_SCENARIO_TARGET_DEADLINE_AT_PREP],
    ["621e3ac7f3a02ab8cd976a350ccdc66f9ec79ce765df94bff4295de23ac8cbaa", SHORT_SCENARIO_REPLICATION_ID],
    ["0x98711c08ae571bf92b75a8d9fd231e06e607ce72d1fc3c4c13c873c9678c102a", SHORT_SCENARIO_CREATED_TX],
    ["37fa397f285c30c8e1ffe491bd9015b733fbe342b4094c8bab6a50b12171056d", "10983d19983fddb78274363a0d508e65cc2c4514d96f56f45c55d3e8fd9d5008"],
  ];
  const walk = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      let value = node.nodeValue;
      for (const [from, to] of replacements) value = value.split(from).join(to);
      if (value !== node.nodeValue) node.nodeValue = value;
    }
  };
  if (document.body) walk();
  else window.addEventListener("DOMContentLoaded", walk, { once: true });
}

syncStaticScenarioLabels();
const ZERO_VALUE = 0n;
const readClient = createClient({ chain: studioDevnet });
const STORAGE_KEY = "reprobond.live-audit.v3";

let provider = null;
let account = null;
let writeClient = null;
let snapshot = { challenge: null, replication: null, replicationIds: [], balances: null };
let shortScenario = { challenge: null, replication: null, replicationIds: [], deadline: null };
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
    try { await refreshAuthoritative("accounts changed"); await refreshShortScenario("accounts changed"); }
    catch (error) { log("REFRESH_ERROR: accounts changed", serializeError(error)); }
  });
  provider.on("chainChanged", async (chain) => {
    setText("chain", chain);
    log("WALLET_CHAIN_CHANGED", { chain });
    try { await refreshAuthoritative("chain changed"); await refreshShortScenario("chain changed"); }
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
  await refreshShortScenario("wallet connected");
}
async function readChallenge() {
  try { return await readClient.readContract({
    address: CONTRACT,
    functionName: "get_challenge",
    args: [CHALLENGE_ID],
    jsonSafeReturn: true,
    transactionHashVariant: "latest-nonfinal",
  }); } catch { return null; }
}
async function readChallengeBy(challengeId) {
  try {
    return await readClient.readContract({
      address: CONTRACT,
      functionName: "get_challenge",
      args: [challengeId],
      jsonSafeReturn: true,
      transactionHashVariant: "latest-nonfinal",
    });
  } catch { return null; }
}
async function readReplicationIdsBy(challengeId) {
  try {
    return await readClient.readContract({
      address: CONTRACT,
      functionName: "get_challenge_replication_ids",
      args: [challengeId],
      jsonSafeReturn: true,
      transactionHashVariant: "latest-nonfinal",
    });
  } catch { return []; }
}
async function latestStudioTimestamp() {
  const block = await readClient.request({ method: "eth_getBlockByNumber", params: ["latest", false] });
  if (!block || typeof block.timestamp !== "string" || !/^0x[0-9a-f]+$/i.test(block.timestamp)) {
    throw new Error("Studio Dev latest block timestamp was unavailable; refusing to guess a deadline.");
  }
  const seconds = Number.parseInt(block.timestamp, 16);
  if (!Number.isSafeInteger(seconds)) throw new Error("Studio Dev timestamp was not a safe integer.");
  return seconds;
}
function formatUtcTimestamp(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 19) + "Z";
}
async function refreshShortScenario(label = "short scenario refresh") {
  const challenge = await readChallengeBy(SHORT_SCENARIO_ID);
  const ids = await readReplicationIdsBy(SHORT_SCENARIO_ID);
  const replicationIds = Array.isArray(ids) ? ids : [];
  let replication = null;
  if (replicationIds.length) {
    try {
      replication = await readClient.readContract({
        address: CONTRACT,
        functionName: "get_replication",
        args: [SHORT_SCENARIO_ID, String(replicationIds[0])],
        jsonSafeReturn: true,
        transactionHashVariant: "latest-nonfinal",
      });
    } catch {}
  }
  shortScenario = { challenge, replication, replicationIds, deadline: challenge?.deadline_utc || shortScenario.deadline };
  setText("shortChallengeId", challenge?.challenge_id || SHORT_SCENARIO_ID);
  setText("shortDeadline", challenge?.deadline_utc || "not created");
  setText("shortState", challenge?.state || "not created");
  setText("shortEscrow", challenge ? String(challenge.expected_escrow) + " wei required / " + String(challenge.escrow_funded) + " wei funded" : "not created");
  setText("shortReplicationId", SHORT_SCENARIO_REPLICATION_ID);
  setText("shortScenarioState", { label, shortScenario });
  updateShortButtons();
  return shortScenario;
}
async function readReplicationIds() {
  try { return await readClient.readContract({
    address: CONTRACT,
    functionName: "get_challenge_replication_ids",
    args: [CHALLENGE_ID],
    jsonSafeReturn: true,
    transactionHashVariant: "latest-nonfinal",
  }); } catch { return []; }
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
  updateShortButtons();
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
    next: !snapshot.challenge ? "Connect sponsor and create the canonical challenge."
      : state === "DRAFT" ? "Connect sponsor and fund the exact escrow."
      : state === "FUNDED" ? "Connect sponsor and activate."
      : state === "OPEN" && !snapshot.replication ? "Switch to the replicator wallet and submit."
      : repState === "SUBMITTED" ? "Wait until the frozen deadline, then connect the sponsor and attempt expiry before adjudication."
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
  $("create").disabled = busy || Boolean(challenge) || !sponsor;
  $("fund").disabled = busy || !challenge || challenge.state !== "DRAFT" || asBigInt(challenge.expected_escrow) !== 3000000000000n || !sponsor;
  $("activate").disabled = busy || !challenge || challenge.state !== "FUNDED" || asBigInt(challenge.escrow_funded) !== 3000000000000n || !sponsor;
  $("submit").disabled = busy || !challenge || challenge.state !== "OPEN" || Boolean(replication) || !replicator;
  $("expire").disabled = busy || !challenge || challenge.state !== "OPEN" || !replication || replication.state !== "SUBMITTED" || !sponsor || !deadlineReachedLocally();
  $("adjudicate").disabled = busy || !challenge || !replication || replication.state !== "SUBMITTED" || !connected || !audit.expiryAttempt?.complete;
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
function deadlineReachedLocally() {
  const raw = snapshot.challenge?.deadline_utc;
  return typeof raw === "string" && Number.isFinite(Date.parse(raw)) && Date.now() >= Date.parse(raw);
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
async function estimateWrite(method, args, value = ZERO_VALUE) {
  if (!writeClient) throw new Error("Connect the required wallet first.");
  return writeClient.estimateTransactionFeesForWrite({
    address: CONTRACT,
    functionName: method,
    args,
    value,
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
async function sendAndFinalize(label, method, args, expectedSuccess = true, value = ZERO_VALUE) {
  const estimate = await estimateWrite(method, args, value);
  const feeValue = BigInt(estimate.feeValue);
  const preSign = {
    sdkVersion: "genlayer-js 2.0.0-rc.1",
    contract: CONTRACT,
    method,
    args,
    userValue: value,
    feeValue,
    totalEnvelope: value + feeValue,
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
    value,
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
async function createShortScenario() {
  setBusy(true);
  try {
    await refreshShortScenario("before short scenario creation");
    if (shortScenario.challenge) throw new Error("Short scenario ID already exists; refusing to overwrite.");
    await assertAccountChain(SPONSOR, "sponsor");
    const studioTimestamp = await latestStudioTimestamp();
    const deadline = formatUtcTimestamp(studioTimestamp + SHORT_SCENARIO_WINDOW_SECONDS);
    shortScenario.deadline = deadline;
    setText("shortStudioTime", formatUtcTimestamp(studioTimestamp));
    const args = [SHORT_SCENARIO_ID, CLAIM, CRITERIA, EVIDENCE_REQUIREMENTS, "candidate_relative_change_bps.v1", 2000, -2000, 1, SHORT_SCENARIO_REWARD, deadline];
    const result = await sendAndFinalize("short_scenario_creation", "create_challenge", args);
    await refreshShortScenario("after short scenario creation");
    if (!shortScenario.challenge || shortScenario.challenge.state !== "DRAFT") throw new Error("Short scenario creation did not produce DRAFT.");
    audit.shortScenario = { creation: { hash: result.hash, status: txStatus(result.finalized), args }, studioTimestamp: formatUtcTimestamp(studioTimestamp), deadline };
    saveAudit();
    setText("shortScenarioStatus", "Created; fund exact 1 wei escrow next.");
    setStatus("short scenario created; fund exact 1 wei escrow next", "ok");
  } finally { setBusy(false); updateShortButtons(); updateButtons(); }
}
async function fundShortScenario() {
  setBusy(true);
  try {
    await refreshShortScenario("before short scenario funding");
    if (!shortScenario.challenge || shortScenario.challenge.state !== "DRAFT") throw new Error("Short scenario must be DRAFT before funding.");
    if (asBigInt(shortScenario.challenge.expected_escrow) !== SHORT_SCENARIO_ESCROW) throw new Error("Consolidated scenario escrow is not exactly 2 wei.");
    await assertAccountChain(SPONSOR, "sponsor");
    const result = await sendAndFinalize("consolidated_scenario_funding", "fund_challenge", [SHORT_SCENARIO_ID], true, SHORT_SCENARIO_ESCROW);
    await refreshShortScenario("after short scenario funding");
    if (shortScenario.challenge?.state !== "FUNDED") throw new Error("Short scenario funding did not produce FUNDED.");
    audit.shortScenario.funding = { hash: result.hash, status: txStatus(result.finalized), userValue: SHORT_SCENARIO_ESCROW.toString() };
    saveAudit();
    setText("shortScenarioStatus", "Funded; later zero-value CLI audit actions remain locked until the funding proof is recorded.");
  } finally { setBusy(false); updateShortButtons(); updateButtons(); }
}
async function activateShortScenario() {
  setBusy(true);
  try {
    await refreshShortScenario("before short scenario activation");
    if (shortScenario.challenge?.state !== "FUNDED") throw new Error("Short scenario must be FUNDED before activation.");
    await assertAccountChain(SPONSOR, "sponsor");
    const result = await sendAndFinalize("short_scenario_activation", "activate_challenge", [SHORT_SCENARIO_ID]);
    await refreshShortScenario("after short scenario activation");
    if (shortScenario.challenge?.state !== "OPEN") throw new Error("Short scenario activation did not produce OPEN.");
    audit.shortScenario.activation = { hash: result.hash, status: txStatus(result.finalized) };
    saveAudit();
    setText("shortScenarioStatus", "OPEN; switch to replicator and submit before the deadline.");
  } finally { setBusy(false); updateShortButtons(); updateButtons(); }
}
async function submitShortScenario() {
  setBusy(true);
  try {
    await refreshShortScenario("before short scenario submission");
    if (shortScenario.challenge?.state !== "OPEN") throw new Error("Short scenario must be OPEN before submission.");
    if (Date.now() >= Date.parse(shortScenario.challenge.deadline_utc)) throw new Error("Short scenario deadline has already passed; refusing late submission.");
    await assertAccountChain(REPLICATOR, "replicator");
    const result = await sendAndFinalize("short_scenario_submission", "submit_replication", [SHORT_SCENARIO_ID, MANIFEST, BASELINE_RUNS, CANDIDATE_RUNS]);
    await refreshShortScenario("after short scenario submission");
    if (shortScenario.replication?.state !== "SUBMITTED") throw new Error("Short scenario submission did not produce SUBMITTED.");
    audit.shortScenario.submission = { hash: result.hash, status: txStatus(result.finalized), replicationId: shortScenario.replication.replication_id };
    saveAudit();
    setText("shortScenarioStatus", "SUBMITTED; wait until the authoritative deadline, then switch to sponsor.");
  } finally { setBusy(false); updateShortButtons(); updateButtons(); }
}
function updateShortButtons() {
  const challenge = shortScenario.challenge;
  const replication = shortScenario.replication;
  const sponsor = account && sameAddress(account, SPONSOR);
  const replicator = account && sameAddress(account, REPLICATOR);
  $("shortCreate").disabled = true;
  $("shortFund").disabled = busy || !challenge || challenge.challenge_id !== SHORT_SCENARIO_ID || challenge.state !== "DRAFT" || asBigInt(challenge.expected_escrow) !== SHORT_SCENARIO_ESCROW || !sponsor;
  $("shortActivate").disabled = true;
  $("shortSubmit").disabled = true;
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
async function createChallenge() {
  setBusy(true);
  try {
    await refreshAuthoritative("before challenge creation");
    if (snapshot.challenge) throw new Error("Canonical challenge ID already exists; refusing to overwrite.");
    await assertAccountChain(SPONSOR, "sponsor");
    const args = [CHALLENGE_ID, CLAIM, CRITERIA, EVIDENCE_REQUIREMENTS, "candidate_relative_change_bps.v1", 2000, -2000, 3, REWARD, DEADLINE_UTC];
    const result = await sendAndFinalize("creation", "create_challenge", args);
    await refreshAuthoritative("after challenge creation");
    if (!snapshot.challenge || snapshot.challenge.state !== "DRAFT") throw new Error("Creation finalized but challenge is not DRAFT.");
    audit.creation = { hash: result.hash, status: txStatus(result.finalized), args };
    saveAudit();
    setStatus("challenge created; fund exact escrow next", "ok");
  } finally { setBusy(false); updateButtons(); }
}
async function fundChallenge() {
  setBusy(true);
  try {
    await refreshAuthoritative("before funding");
    if (!snapshot.challenge || snapshot.challenge.state !== "DRAFT") throw new Error("Challenge must be DRAFT before funding.");
    if (asBigInt(snapshot.challenge.expected_escrow) !== 3000000000000n) throw new Error("Exact 3,000,000,000,000 wei escrow is required.");
    await assertAccountChain(SPONSOR, "sponsor");
    const result = await sendAndFinalize("funding", "fund_challenge", [CHALLENGE_ID], true, 3000000000000n);
    await refreshAuthoritative("after funding");
    if (!snapshot.challenge || snapshot.challenge.state !== "FUNDED" || asBigInt(snapshot.challenge.escrow_funded) !== 3000000000000n) throw new Error("Funding finalized but exact escrow/state was not recorded.");
    audit.funding = { hash: result.hash, status: txStatus(result.finalized), userValue: "3000000000000" };
    saveAudit();
    setStatus("exact escrow funded; activate next", "ok");
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
async function expireSubmittedAttempt() {
  setBusy(true);
  try {
    await refreshAuthoritative("before SUBMITTED expiry attempt");
    assertChallenge("OPEN");
    if (!snapshot.replication || snapshot.replication.state !== "SUBMITTED") throw new Error("Expiry-block proof requires an authoritative SUBMITTED replication.");
    if (!deadlineReachedLocally()) throw new Error("Frozen deadline has not been reached; refusing to submit a misleading expiry attempt.");
    await assertAccountChain(SPONSOR, "sponsor");
    let result;
    try {
      result = await sendAndFinalize("expiry_submitted_block", "expire_challenge", [CHALLENGE_ID], false);
    } catch (error) {
      audit.expiryAttempt = { complete: true, rejected: true, noFinalizedSuccess: true, error: serializeError(error) };
      saveAudit();
      await refreshAuthoritative("after fee-estimation rejection");
      setStatus("expiry rejected before submission; inspect log for the SUBMITTED guard", "ok");
      log("EXPIRY_BLOCK_PROOF", audit.expiryAttempt);
      return;
    }
    await refreshAuthoritative("after SUBMITTED expiry attempt");
    audit.expiryAttempt = {
      complete: true,
      rejected: !result.success,
      hash: result.hash,
      status: txStatus(result.finalized),
      stateAfter: snapshot.challenge?.state,
      replicationStateAfter: snapshot.replication?.state,
    };
    saveAudit();
    if (result.success || snapshot.challenge?.state !== "OPEN" || snapshot.replication?.state !== "SUBMITTED") {
      throw new Error("Expiry did not remain rejected while SUBMITTED work was pending.");
    }
    setStatus("expiry rejected with SUBMITTED replication pending; adjudication unlocked", "ok");
  } finally { setBusy(false); updateButtons(); }
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
$("shortCreate").addEventListener("click", () => createShortScenario().catch((error) => {
  log("ACTION_ERROR: short scenario creation", serializeError(error));
  setStatus("short scenario creation failed; see log", "bad");
}));
$("shortFund").addEventListener("click", () => fundShortScenario().catch((error) => {
  log("ACTION_ERROR: short scenario funding", serializeError(error));
  setStatus("short scenario funding failed; see log", "bad");
}));
$("shortActivate").addEventListener("click", () => activateShortScenario().catch((error) => {
  log("ACTION_ERROR: short scenario activation", serializeError(error));
  setStatus("short scenario activation failed; see log", "bad");
}));
$("shortSubmit").addEventListener("click", () => submitShortScenario().catch((error) => {
  log("ACTION_ERROR: short scenario submission", serializeError(error));
  setStatus("short scenario submission failed; see log", "bad");
}));
$("create").addEventListener("click", () => createChallenge().catch((error) => {
  log("ACTION_ERROR: creation", serializeError(error));
  setStatus("creation failed; see log", "bad");
}));
$("fund").addEventListener("click", () => fundChallenge().catch((error) => {
  log("ACTION_ERROR: funding", serializeError(error));
  setStatus("funding failed; see log", "bad");
}));
$("activate").addEventListener("click", () => activate().catch((error) => {
  log("ACTION_ERROR: activation", serializeError(error));
  setStatus("activation failed; see log", "bad");
}));
$("submit").addEventListener("click", () => submitReplication().catch((error) => {
  log("ACTION_ERROR: submission", serializeError(error));
  setStatus("submission failed; see log", "bad");
}));
$("expire").addEventListener("click", () => expireSubmittedAttempt().catch((error) => {
  log("ACTION_ERROR: expiry", serializeError(error));
  setStatus("expiry attempt failed; see log", "bad");
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
setText("shortChallengeId", SHORT_SCENARIO_ID);
setText("shortStudioTime", SHORT_SCENARIO_STUDIO_TIME_AT_PREP);
setText("shortDeadline", SHORT_SCENARIO_TARGET_DEADLINE_AT_PREP);
setText("shortState", "not created");
setText("shortEscrow", "2 wei required / 0 wei funded");
setText("shortReplicationId", SHORT_SCENARIO_REPLICATION_ID);
setText("shortScenarioState", { challengeId: SHORT_SCENARIO_ID, requiredSlots: 2, rewardPerSlot: SHORT_SCENARIO_REWARD, expectedEscrow: SHORT_SCENARIO_ESCROW, studioTimeAtPreparation: SHORT_SCENARIO_STUDIO_TIME_AT_PREP, deadline: SHORT_SCENARIO_TARGET_DEADLINE_AT_PREP, createdTx: SHORT_SCENARIO_CREATED_TX, note: "Consolidated challenge exists on-chain. Only funding is enabled; all later audit actions use zero-user-value CLI writes." });
setText("shortScenarioStatus", "Consolidated challenge created; connect sponsor and click Fund consolidated challenge.");
updatePlan();
updateButtons();
updateShortButtons();
