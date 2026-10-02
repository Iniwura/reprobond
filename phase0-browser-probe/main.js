import { abi, chains, createClient } from "genlayer-js";
import { encodeFunctionData } from "viem";

const PROBE = "0x55F7b0F158589998164fef1fBC3851211d8DFbfC";
const FUNDER = "0xa35dc047f9937bf668743efbdf8ea93b31a55888";
const RPC = "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const CHAIN_ID_HEX = "0xf22d";
const CHAIN = {
  ...chains.studionet,
  id: CHAIN_ID,
  name: "GenLayer Studio Devnet",
  rpcUrls: { default: { http: [RPC] }, public: { http: [RPC] } },
};

const FEE_AWARE_ADD_TRANSACTION_ABI = [{
  type: "function",
  name: "addTransaction",
  stateMutability: "payable",
  inputs: [{
    name: "_params",
    type: "tuple",
    components: [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "numOfInitialValidators", type: "uint256" },
      { name: "maxRotations", type: "uint256" },
      { name: "validUntil", type: "uint256" },
      { name: "saltNonce", type: "uint256" },
      { name: "userValue", type: "uint256" },
      {
        name: "feesDistribution",
        type: "tuple",
        components: [
          { name: "leaderTimeunitsAllocation", type: "uint256" },
          { name: "validatorTimeunitsAllocation", type: "uint256" },
          { name: "appealRounds", type: "uint256" },
          { name: "executionBudgetPerRound", type: "uint256" },
          { name: "executionConsumed", type: "uint256" },
          { name: "totalMessageFees", type: "uint256" },
          { name: "rotations", type: "uint256[]" },
          { name: "maxPriceGenPerTimeUnit", type: "uint256" },
          { name: "storageFeeMaxGasPrice", type: "uint256" },
          { name: "receiptFeeMaxGasPrice", type: "uint256" },
        ],
      },
      { name: "txCalldata", type: "bytes" },
      {
        name: "messageAllocations",
        type: "tuple[]",
        components: [
          { name: "messageType", type: "uint8" },
          { name: "onAcceptance", type: "bool" },
          { name: "parentIndex", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "callKey", type: "bytes32" },
          { name: "budget", type: "uint256" },
          { name: "feeParams", type: "bytes" },
        ],
      },
    ],
  }],
  outputs: [],
}];

const $ = (id) => document.getElementById(id);
const provider = () => window.ethereum;
let client;
let account;
let evidence = {
  network: { chainId: CHAIN_ID, rpc: RPC, probe: PROBE },
  actions: [],
  reads: [],
  limitations: [],
};

function safe(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_, v) => {
    if (typeof v === "bigint") return v.toString();
    if (v && typeof v === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
    }
    return v;
  }, 2);
}

function serializeError(value, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (depth > 5) return "[MaxDepth]";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  const output = {};
  const keys = new Set([
    "name", "message", "code", "shortMessage", "details", "stack", "data", "cause",
    ...Object.keys(value),
    ...Object.getOwnPropertyNames(value),
  ]);
  for (const key of keys) {
    try {
      if (key in value) output[key] = serializeError(value[key], seen, depth + 1);
    } catch {
      output[key] = "[Unserializable]";
    }
  }
  return output;
}

function providerSummary(candidate) {
  if (!candidate) return null;
  return {
    isRabby: Boolean(candidate.isRabby || candidate._isRabby),
    isMetaMask: Boolean(candidate.isMetaMask),
    isCoinbaseWallet: Boolean(candidate.isCoinbaseWallet),
    hasRequest: typeof candidate.request === "function",
    exposedKeys: Object.keys(candidate)
      .filter((key) => !/(private|secret|seed|key)/i.test(key))
      .slice(0, 40),
  };
}

function getProviderSelection() {
  const injected = typeof window !== "undefined" ? window.ethereum : undefined;
  const providers = Array.isArray(injected?.providers)
    ? injected.providers.filter(Boolean)
    : (injected ? [injected] : []);
  const selected = providers.find((candidate) => candidate.isRabby || candidate._isRabby)
    || providers.find((candidate) => candidate.isMetaMask)
    || providers[0];
  return {
    injected,
    providers,
    selected,
    summary: {
      providerVisible: Boolean(injected),
      providerCount: providers.length,
      root: providerSummary(injected),
      candidates: providers.map(providerSummary),
      selected: providerSummary(selected),
    },
  };
}

async function walletRequest(selection, label, method, params = []) {
  log("WALLET_REQUEST: " + label, { method, params });
  try {
    const result = await selection.selected.request({ method, params });
    log("WALLET_RESPONSE: " + label, { method, result });
    return result;
  } catch (error) {
    log("WALLET_ERROR: " + label, { method, error: serializeError(error) });
    throw error;
  }
}

function log(message, value) {
  const line = `${new Date().toISOString()} ${message}${value === undefined ? "" : `\n${safe(value)}`}`;
  $("log").textContent += `${line}\n\n`;
  console.log(message, value);
}

function setStatus(id, value) { $(id).textContent = value; }

function amount() {
  const raw = $("amount").value.trim();
  if (!/^\d+$/.test(raw) || raw === "0") throw new Error("Amount must be a positive integer number of wei.");
  return BigInt(raw);
}

function recipient() {
  const value = $("recipient").value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("Recipient must be a 20-byte EVM address.");
  return value;
}

async function ensureWallet() {
  const selection = getProviderSelection();
  log("INJECTED_PROVIDER_SELECTION", selection.summary);
  if (!selection.selected || typeof selection.selected.request !== "function") {
    throw {
      name: "ProviderUnavailableError",
      code: "NO_EIP1193_PROVIDER",
      message: "No EIP-1193 wallet provider found. Install/connect Rabby or MetaMask in the browser.",
      details: selection.summary,
    };
  }

  const requestedAccounts = await walletRequest(selection, "eth_requestAccounts", "eth_requestAccounts");
  const beforeChain = await walletRequest(selection, "eth_chainId before switch", "eth_chainId");
  log("STUDIO_CHAIN_CONFIG", {
    expectedChainId: CHAIN_ID,
    expectedChainIdHex: CHAIN_ID_HEX,
    rpc: RPC,
    chainName: CHAIN.name,
  });

  if (String(beforeChain).toLowerCase() !== CHAIN_ID_HEX) {
    try {
      await walletRequest(selection, "wallet_switchEthereumChain", "wallet_switchEthereumChain", [{ chainId: CHAIN_ID_HEX }]);
    } catch (error) {
      const structured = serializeError(error);
      log("WALLET_SWITCH_FAILURE", structured);
      const code = structured?.code ?? structured?.data?.originalError?.code;
      if (code !== 4902 && code !== "4902") throw error;
      await walletRequest(selection, "wallet_addEthereumChain", "wallet_addEthereumChain", [{
        chainId: CHAIN_ID_HEX,
        chainName: "GenLayer Studio Devnet",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [RPC],
      }]);
      await walletRequest(selection, "wallet_switchEthereumChain after add", "wallet_switchEthereumChain", [{ chainId: CHAIN_ID_HEX }]);
    }
  }

  const afterChain = await walletRequest(selection, "eth_chainId after switch", "eth_chainId");
  if (String(afterChain).toLowerCase() !== CHAIN_ID_HEX) {
    throw {
      name: "ChainMismatchError",
      code: "CHAIN_MISMATCH",
      message: "Wallet did not switch to Studio Dev.",
      details: { expected: CHAIN_ID_HEX, actual: afterChain },
    };
  }

  const accounts = await walletRequest(selection, "eth_accounts", "eth_accounts");
  if (!accounts?.[0]) {
    throw {
      name: "AccountUnavailableError",
      code: "NO_CONNECTED_ACCOUNT",
      message: "The wallet returned no connected account.",
      details: { requestedAccounts, accounts },
    };
  }
  account = accounts[0];
  client = createClient({ chain: CHAIN, endpoint: RPC, account, provider: selection.selected });
  log("SDK_CLIENT_CREATED", {
    account,
    provider: selection.summary.selected,
    endpoint: RPC,
    chainId: CHAIN_ID,
  });
  setStatus("wallet", account);
  setStatus("chain", CHAIN_ID + " (" + CHAIN_ID_HEX + ")");
  ["fund", "insufficient", "unauthorized", "payout", "replay"].forEach((id) => document.getElementById(id).disabled = false);
  log("WALLET_CONNECTED", { account, expectedFunder: FUNDER, chainId: CHAIN_ID });
  await readAll("after wallet connection");
}

async function readBalance(address) {
  return client.getBalance({ address, blockTag: "latest" });
}

async function readAll(label) {
  if (!client) return;
  const recipientAddress = recipient();
  const values = {
    label,
    wallet: account,
    funder: FUNDER,
    probe: await readBalance(PROBE),
    connectedWallet: await readBalance(account),
    recipient: await readBalance(recipientAddress),
  };
  evidence.reads.push(values);
  $("balances").innerHTML = [
    ["probe contract", values.probe],
    ["connected wallet", values.connectedWallet],
    ["recipient B", values.recipient],
  ].map(([name, value]) => `<div class="row"><span>${name}</span><code>${value} wei</code></div>`).join("");
  log(`AUTHORITATIVE_BALANCES: ${label}`, values);
  return values;
}

async function trySnapshot(label) {
  try {
    const snapshot = await client.readContract({
      address: PROBE,
      functionName: "snapshot",
      transactionHashVariant: "latest-nonfinal",
    });
    evidence.reads.push({ label, snapshot });
    $("state").textContent = safe(snapshot);
    log(`PROBE_SNAPSHOT_READ: ${label}`, snapshot);
    return snapshot;
  } catch (error) {
    const limitation = { label, error: serializeError(error) };
    evidence.limitations.push({ probeSnapshot: limitation });
    document.getElementById("state").textContent = "The deployed snapshot() view did not execute in Studio Dev. " + safe(serializeError(error));
    log(`PROBE_SNAPSHOT_UNAVAILABLE: ${label}`, limitation);
    return null;
  }
}

function toHex(value) {
  return "0x" + BigInt(value).toString(16);
}

function buildInnerCallData(functionName, args = []) {
  const calldataObject = abi.calldata.makeCalldataObject(functionName, args, undefined);
  const encodedCall = abi.calldata.encode(calldataObject);
  return abi.transactions.serialize([encodedCall, false]);
}

function normalizeFeeDistribution(distribution) {
  const numericFields = [
    "leaderTimeunitsAllocation",
    "validatorTimeunitsAllocation",
    "appealRounds",
    "executionBudgetPerRound",
    "executionConsumed",
    "totalMessageFees",
    "maxPriceGenPerTimeUnit",
    "storageFeeMaxGasPrice",
    "receiptFeeMaxGasPrice",
  ];
  if (!distribution || !Array.isArray(distribution.rotations)) {
    throw {
      name: "FeeEstimationError",
      code: "MALFORMED_FEE_DISTRIBUTION",
      message: "Studio returned no usable fee distribution.",
    };
  }
  const normalized = {};
  for (const field of numericFields) {
    if (distribution[field] === undefined || distribution[field] === null) {
      throw {
        name: "FeeEstimationError",
        code: "MALFORMED_FEE_DISTRIBUTION",
        message: "Studio fee distribution is missing " + field + ".",
      };
    }
    normalized[field] = BigInt(distribution[field]);
  }
  normalized.rotations = distribution.rotations.map((rotation) => BigInt(rotation));
  return normalized;
}

function normalizeMessageAllocations(allocations) {
  if (!Array.isArray(allocations)) return [];
  return allocations.map((allocation) => ({
    messageType: Number(allocation.messageType),
    onAcceptance: Boolean(allocation.onAcceptance),
    parentIndex: BigInt(allocation.parentIndex),
    recipient: allocation.recipient,
    callKey: allocation.callKey,
    budget: BigInt(allocation.budget),
    feeParams: allocation.feeParams,
  }));
}

function extractRecommendedFeePreset(response, error) {
  const candidates = [
    response?.recommendedPreset,
    response?.recommended_fee_preset,
    response?.receipt?.genvm_result?.fee_accounting?.recommended_fee_preset,
    response?.data?.recommendedPreset,
    error?.data?.recommendedPreset,
    error?.data?.recommended_fee_preset,
    error?.data?.receipt?.genvm_result?.fee_accounting?.recommended_fee_preset,
    error?.data?.data?.recommendedPreset,
    error?.cause?.data?.recommendedPreset,
    error?.cause?.data?.recommended_fee_preset,
    error?.cause?.data?.receipt?.genvm_result?.fee_accounting?.recommended_fee_preset,
    error?.cause?.data?.data?.recommendedPreset,
  ];
  return candidates.find((candidate) =>
    candidate && candidate.distribution && candidate.feeValue !== undefined
  );
}

function safeFeeEstimationError(error) {
  return {
    name: "FeeEstimationError",
    code: error?.code ?? "FEE_ESTIMATION_FAILED",
    message: "Studio fee estimation did not return a usable recommendation.",
    shortMessage: "No usable fee recommendation",
  };
}

function normalizeFeeEstimate(preset, source) {
  if (!preset?.distribution || preset.feeValue === undefined) {
    throw {
      name: "FeeEstimationError",
      code: "MALFORMED_FEE_ESTIMATE",
      message: "Studio returned a malformed fee recommendation.",
    };
  }
  return {
    source,
    feeValue: BigInt(preset.feeValue),
    distribution: normalizeFeeDistribution(preset.distribution),
    messageAllocations: normalizeMessageAllocations(preset.messageAllocations),
  };
}

async function estimateTransactionFeesForWrite({ address, functionName, args, value }) {
  const innerData = buildInnerCallData(functionName, args);
  const feeConfig = await client.request({ method: "sim_getFeeConfig", params: [] });
  const defaultFees = feeConfig?.defaultFees ?? feeConfig?.default_fees;
  if (!defaultFees) {
    throw {
      name: "FeeEstimationError",
      code: "FEE_CONFIG_UNAVAILABLE",
      message: "Studio did not return default fee configuration.",
    };
  }

  const requestParams = {
    type: "write",
    to: address,
    from: account,
    data: innerData,
    transaction_hash_variant: "latest-nonfinal",
    value: toHex(value),
    fees: defaultFees,
  };
  log("FEE_ESTIMATE_REQUEST", {
    intelligentContract: address,
    method: functionName,
    args,
    userValue: value,
    currentChainId: CHAIN_ID,
    connectedAccount: account,
  });

  let response;
  let preset;
  let source;
  try {
    response = await client.request({
      method: "sim_estimateTransactionFees",
      params: [requestParams],
    });
    preset = extractRecommendedFeePreset(response);
    source = "sim_estimateTransactionFees.result";
  } catch (error) {
    // Studio may return the recommendation in JSON-RPC error data while
    // reporting the simulation itself as an execution failure. Never log
    // that raw error object: it can contain node-internal diagnostics.
    preset = extractRecommendedFeePreset(undefined, error);
    source = "sim_estimateTransactionFees.error-data";
    if (!preset) throw safeFeeEstimationError(error);
  }

  const estimate = normalizeFeeEstimate(preset, source);
  log("FEE_ESTIMATE_RESULT", {
    source: estimate.source,
    feeValue: estimate.feeValue,
    distribution: estimate.distribution,
    messageAllocations: estimate.messageAllocations,
  });
  return { ...estimate, innerData };
}

function buildFeeAwareConsensusCall({ address, value, estimate }) {
  const params = {
    sender: account,
    recipient: address,
    numOfInitialValidators: BigInt(CHAIN.defaultNumberOfInitialValidators),
    maxRotations: BigInt(CHAIN.defaultConsensusMaxRotations),
    validUntil: BigInt(Math.floor(Date.now() / 1000) + 3600),
    saltNonce: 0n,
    userValue: value,
    feesDistribution: estimate.distribution,
    txCalldata: estimate.innerData,
    messageAllocations: estimate.messageAllocations,
  };
  const data = encodeFunctionData({
    abi: FEE_AWARE_ADD_TRANSACTION_ABI,
    functionName: "addTransaction",
    args: [params],
  });
  return { data, value: value + estimate.feeValue };
}

async function submitFeeAwareWrite({ address, functionName, args, value }) {
  const estimate = await estimateTransactionFeesForWrite({ address, functionName, args, value });
  const consensusCall = buildFeeAwareConsensusCall({ address, value, estimate });
  const consensusAddress = CHAIN.consensusMainContract.address;
  const gas = await client.estimateTransactionGas({
    from: account,
    to: consensusAddress,
    data: consensusCall.data,
    value: consensusCall.value,
  });
  const nonce = await client.getCurrentNonce({ address: account });
  let gasPrice;
  try {
    gasPrice = await client.request({ method: "eth_gasPrice", params: [] });
  } catch {
    gasPrice = undefined;
  }

  const txRequest = {
    from: account,
    to: consensusAddress,
    data: consensusCall.data,
    value: toHex(consensusCall.value),
    gas: toHex(gas),
    nonce: toHex(nonce),
    type: "0x0",
    chainId: CHAIN_ID_HEX,
    ...(gasPrice ? { gasPrice } : {}),
  };
  log("PRE_SIGN_FEE_AWARE_WRITE", {
    intelligentContract: address,
    method: functionName,
    args,
    userValue: value,
    feeValue: estimate.feeValue,
    feeDistribution: estimate.distribution,
    currentChainId: CHAIN_ID,
    connectedAccount: account,
    consensusEnvelopeTo: consensusAddress,
    totalEnvelopeValue: consensusCall.value,
    gas,
    nonce,
  });

  const selection = getProviderSelection();
  if (!selection.selected || typeof selection.selected.request !== "function") {
    throw {
      name: "ProviderUnavailableError",
      code: "NO_EIP1193_PROVIDER",
      message: "The signing provider is no longer available.",
    };
  }
  const txHash = await selection.selected.request({
    method: "eth_sendTransaction",
    params: [txRequest],
  });
  log("FEE_AWARE_WRITE_SUBMITTED", { txHash });
  return { txHash, estimate, consensusCall };
}

function transactionSuccessDetails(transaction) {
  const statusName = transaction?.statusName
    ?? (typeof transaction?.status === "string" ? transaction.status : undefined);
  const executionResultName = transaction?.txExecutionResultName
    ?? transaction?.executionResultName
    ?? (typeof transaction?.txExecutionResult === "string" ? transaction.txExecutionResult : undefined)
    ?? (typeof transaction?.executionResult === "string" ? transaction.executionResult : undefined);
  return {
    successful: (statusName === "ACCEPTED" || statusName === "FINALIZED")
      && executionResultName === "FINISHED_WITH_RETURN",
    statusName,
    executionResultName,
  };
}

async function waitFinal(txHash, label) {
  log(`TX_SUBMITTED: ${label}`, { txHash, expectedFinality: "FINALIZED" });
  const accepted = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
    interval: 1000,
    retries: 180,
    fullTransaction: true,
  });
  log(`TX_ACCEPTED: ${label}`, accepted);
  const finalized = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "FINALIZED",
    interval: 1000,
    retries: 600,
    fullTransaction: true,
  });
  log(`TX_FINALIZED: ${label}`, finalized);
  evidence.actions.push({ label, txHash, accepted, finalized });
  return finalized;
}

async function action(label, fn) {
  try {
    const result = await fn();
    log(`ACTION_OK: ${label}`, result);
    return result;
  } catch (error) {
    log(`ACTION_ERROR: ${label}`, { error: serializeError(error), account });
    evidence.actions.push({ label, error: serializeError(error), account });
    return null;
  }
}

async function fund() {
  await action("fund", async () => {
    const value = amount();
    const before = await readAll("before fund");
    const submission = await submitFeeAwareWrite({
      address: PROBE,
      functionName: "fund",
      args: [],
      value,
    });
    const finalized = await waitFinal(submission.txHash, "fund");
    const execution = transactionSuccessDetails(finalized);
    log("GENLAYER_EXECUTION_RESULT", {
      txHash: submission.txHash,
      ...execution,
    });
    if (!execution.successful) {
      throw {
        name: "ExecutionVerificationError",
        code: "GENLAYER_EXECUTION_NOT_SUCCESSFUL",
        message: "The transaction finalized without a verified successful Intelligent Contract execution.",
        details: execution,
      };
    }
    const after = await readAll("after fund");
    const returnEvidence = {
      txHash: submission.txHash,
      value,
      feeValue: submission.estimate.feeValue,
      result: finalized.result,
      statusName: finalized.statusName,
      execution,
      before,
      after,
    };
    await trySnapshot("after fund");
    return returnEvidence;
  });
}

async function rejection(label, payoutAmount, expectedSender) {
  return action(label, async () => {
    const txHash = await client.writeContract({
      address: PROBE,
      functionName: "payout",
      args: [recipient(), payoutAmount],
      value: 0n,
    });
    const finalized = await waitFinal(txHash, label);
    const result = { txHash, expectedSender, account, result: finalized.result, statusName: finalized.statusName, executionResult: finalized.executionResult };
    await readAll(`after ${label}`);
    await trySnapshot(`after ${label}`);
    return result;
  });
}

async function insufficient() {
  const current = await readBalance(PROBE);
  return rejection("insufficient balance payout", current + amount(), account);
}

async function unauthorized() {
  if (account.toLowerCase() === FUNDER.toLowerCase()) {
    log("UNAUTHORIZED_TEST_NOT_RUN", "Switch the connected wallet to a different account, then click the button again.");
    return;
  }
  return rejection("unauthorized payout", amount(), FUNDER);
}

async function payout() {
  return action("payout exact amount", async () => {
    if (account.toLowerCase() !== FUNDER.toLowerCase()) throw new Error(`Connected wallet ${account} is not the probe funder ${FUNDER}. Switch back to the funder first.`);
    const value = amount();
    const before = await readAll("before payout");
    const txHash = await client.writeContract({ address: PROBE, functionName: "payout", args: [recipient(), value], value: 0n });
    const finalized = await waitFinal(txHash, "payout exact amount");
    const after = await readAll("after payout");
    const returnEvidence = { txHash, requestedAmount: value, result: finalized.result, statusName: finalized.statusName, before, after };
    await trySnapshot("after payout");
    return returnEvidence;
  });
}

async function replay() {
  return rejection("duplicate payout replay", amount(), FUNDER);
}

$("connect").onclick = () => action("connect wallet", ensureWallet);
$("refresh").onclick = () => action("refresh wallet", async () => {
  await ensureWallet();
  return readAll("manual refresh");
});
$("fund").onclick = fund;
$("insufficient").onclick = insufficient;
$("unauthorized").onclick = unauthorized;
$("payout").onclick = payout;
$("replay").onclick = replay;
$("download").onclick = () => {
  const blob = new Blob([safe(evidence)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "reprobond-phase0-payout-evidence.json";
  link.click();
  URL.revokeObjectURL(link.href);
};

if (!provider()) log("WALLET_UNAVAILABLE", "No window.ethereum provider is visible in this browser context.");
