import { createClient, isSuccessful } from 'genlayer-js'
import { studioDevnet } from 'genlayer-js/chains'
import { CONTRACT_SOURCE } from './deploy-contract'

const CHAIN_ID = 61997
const CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`
const SPONSOR = '0xa35dc047f9937bf668743efbdf8ea93b31a55888'
const RPC_URL = 'https://studio-dev.genlayer.com/api'
type Provider = NonNullable<Window['ethereum']>
type Candidate = { provider: Provider; label: string; rdns?: string; uuid?: string }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T
const logNode = $('log')
const providerSelect = $('provider-select') as HTMLSelectElement
const state = { provider: null as Provider | null, candidate: null as Candidate | null, candidates: [] as Candidate[], address: '', chain: '', estimate: null as any, sha: '' }

function safe(value: unknown, seen = new WeakSet<object>(), depth = 0): any {
  if (value === null || value === undefined || typeof value !== 'object') return value
  if (depth > 7) return '[MaxDepth]'
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => safe(item, seen, depth + 1))
  const out: Record<string, unknown> = {}
  for (const key of new Set(['name','message','code','shortMessage','details','cause','data','stack',...Object.keys(value as object)])) {
    try { if (key in (value as any)) out[key] = safe((value as any)[key], seen, depth + 1) } catch { out[key] = '[Unserializable]' }
  }
  return out
}
function json(value: unknown) {
  return JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item, 2)
}
function write(label: string, value: unknown) {
  logNode.textContent += `\n[${new Date().toISOString()}] ${label}\n${typeof value === 'string' ? value : json(value)}\n`
  logNode.scrollTop = logNode.scrollHeight
}
function errorText(error: unknown) { write('ERROR', safe(error)); }
function addCandidate(candidate: Candidate) {
  if (candidate.provider && !state.candidates.some((item) => item.provider === candidate.provider)) state.candidates.push(candidate)
}
function providerLabel(info: any, provider: Provider) {
  return [info?.name, provider.isRabby || provider._isRabby ? 'Rabby' : '', provider.isMetaMask ? 'MetaMask' : ''].filter(Boolean).join(' · ') || 'Injected provider'
}
async function discoverProviders() {
  const announced: Candidate[] = []
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail || {}
    if (detail.provider) announced.push({ provider: detail.provider as Provider, label: providerLabel(detail.info, detail.provider), rdns: detail.info?.rdns, uuid: detail.info?.uuid })
  }
  window.addEventListener('eip6963:announceProvider', handler as EventListener)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  await new Promise((resolve) => setTimeout(resolve, 300))
  window.removeEventListener('eip6963:announceProvider', handler as EventListener)
  announced.forEach(addCandidate)
  const injected = window.ethereum
  if (injected) {
    const providers = Array.isArray(injected.providers) ? injected.providers.filter(Boolean) : [injected]
    providers.forEach((provider, index) => addCandidate({ provider, label: providerLabel({}, provider) || 'window.ethereum provider ' + (index + 1) }))
  }
  if (!state.candidates.length) {
    $('provider').textContent = 'No EIP-6963 or window.ethereum provider detected'
    providerSelect.innerHTML = '<option>No provider detected</option>'
    write('PROVIDER DISCOVERY', { eip6963Count: announced.length, windowEthereum: Boolean(window.ethereum), candidates: [] })
    return
  }
  providerSelect.innerHTML = ''
  state.candidates.forEach((candidate, index) => {
    const option = document.createElement('option')
    option.value = String(index)
    option.textContent = candidate.label
    providerSelect.appendChild(option)
  })
  const rabbyIndex = state.candidates.findIndex((item) => /rabby/i.test(item.label + ' ' + (item.rdns || '')) || item.provider.isRabby || item.provider._isRabby)
  providerSelect.value = String(rabbyIndex >= 0 ? rabbyIndex : 0)
  state.candidate = state.candidates[Number(providerSelect.value)]
  state.provider = state.candidate.provider
  providerSelect.disabled = state.candidates.length < 2
  $('provider').textContent = state.candidates.map((item) => item.label).join(' | ')
  write('PROVIDER DISCOVERY', { eip6963Count: announced.length, windowEthereum: Boolean(window.ethereum), candidates: state.candidates.map((item) => ({ label: item.label, rdns: item.rdns, uuid: item.uuid })), selected: state.candidate.label })
}
async function chain(provider: Provider) { return String(await provider.request({ method: 'eth_chainId' })).toLowerCase() }
async function accounts(provider: Provider) {
  const result = await provider.request({ method: 'eth_accounts' })
  return Array.isArray(result) ? result.filter((item): item is string => typeof item === 'string') : []
}
async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
function refreshButtons() {
  $('deploy').toggleAttribute('disabled', !(state.address.toLowerCase() === SPONSOR.toLowerCase() && state.chain === CHAIN_HEX))
  $('estimate').toggleAttribute('disabled', !(state.address.toLowerCase() === SPONSOR.toLowerCase() && state.chain === CHAIN_HEX))
}
async function connect() {
  try {
    const candidate = state.candidates[Number(providerSelect.value)]
    if (!candidate) throw new Error('No detected provider is available.')
    state.candidate = candidate
    state.provider = candidate.provider
    write('REQUESTING ACCOUNTS', { provider: candidate.label, method: 'eth_requestAccounts' })
    await state.provider.request({ method: 'eth_requestAccounts' })
    state.chain = await chain(state.provider)
    if (state.chain !== CHAIN_HEX) {
      write('SWITCHING CHAIN', { method: 'wallet_switchEthereumChain', chainId: CHAIN_HEX })
      await state.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] })
      state.chain = await chain(state.provider)
    }
    state.address = (await accounts(state.provider))[0] || ''
    $('wallet').textContent = (state.address || 'no account') + ' · chain ' + state.chain
    write('CONNECTED', { provider: candidate.label, address: state.address, chainId: state.chain, expectedChainId: CHAIN_ID, expectedHex: CHAIN_HEX })
    if (state.address.toLowerCase() !== SPONSOR.toLowerCase()) throw new Error('Connected account is not the required sponsor: ' + state.address)
    refreshButtons()
    await estimate()
  } catch (error) { errorText(error); refreshButtons() }
}
async function estimate() {
  try {
    if (!state.provider || !state.address || state.chain !== CHAIN_HEX) throw new Error('Connect the required sponsor wallet on Studio Dev first.')
    const client = createClient({ chain: studioDevnet, account: state.address as `0x${string}`, provider: state.provider as any }) as any
    const estimate = await client.estimateTransactionFees()
    state.estimate = estimate
    write('FEE ESTIMATE (no transaction)', {
      feeValue: estimate.feeValue,
      userValue: '0',
      totalEnvelope: estimate.feeValue,
      distribution: estimate.distribution,
      messageAllocations: estimate.messageAllocations || [],
    })
    $('estimate').textContent = 'Refresh fee estimate'
  } catch (error) { errorText(error) }
}
async function deploy() {
  try {
    if (!state.provider || !state.estimate) throw new Error('Refresh a valid fee estimate first.')
    if (state.address.toLowerCase() !== SPONSOR.toLowerCase() || state.chain !== CHAIN_HEX) throw new Error('Sponsor and chain gate failed.')
    const client = createClient({ chain: studioDevnet, account: state.address as `0x${string}`, provider: state.provider as any }) as any
    const estimate = await client.estimateTransactionFees()
    state.estimate = estimate
    write('PRE-SIGN DEPLOYMENT', {
      contractSource: 'contracts/repro_bond.py',
      sourceSha256: state.sha,
      sourceBytes: new TextEncoder().encode(CONTRACT_SOURCE).length,
      userValue: '0',
      feeValue: estimate.feeValue,
      totalEnvelope: estimate.feeValue,
      feeDistribution: estimate.distribution,
      connectedAccount: state.address,
      chainId: CHAIN_ID,
      rpc: RPC_URL,
      note: 'Rabby signature is required next; no transaction is submitted before this call.'
    })
    const hash = await client.deployContract({ code: CONTRACT_SOURCE, fees: { distribution: estimate.distribution, messageAllocations: estimate.messageAllocations, feeValue: estimate.feeValue } })
    write('DEPLOYMENT SUBMITTED', { transactionHash: hash })
    const decided = await client.waitForTransactionReceipt({ hash, waitUntil: 'decided', interval: 2000, retries: 180, fullTransaction: true })
    write('DEPLOYMENT DECIDED', decided)
    const finalized = await client.waitForTransactionReceipt({ hash, waitUntil: 'finalized', interval: 2000, retries: 300, fullTransaction: true })
    write('DEPLOYMENT FINALIZED', { successful: isSuccessful(finalized), receipt: finalized })
    if (!isSuccessful(finalized)) throw new Error(`Deployment execution failed: ${finalized?.txExecutionResultName || finalized?.execution_result || 'unknown'}`)
    const address = finalized?.data?.contract_address || finalized?.txDataDecoded?.contractAddress
    if (!address) throw new Error('Deployment finalized but no contract address was exposed by the SDK receipt.')
    const schema = await client.getContractSchema(address)
    const deployedSource = await client.getContractCode(address)
    const deployedSha = await sha256(deployedSource)
    write('DEPLOYMENT PROOF', { contractAddress: address, transactionHash: hash, sourceSha256: deployedSha, expectedSourceSha256: state.sha, sourceMatches: deployedSha === state.sha, schema })
    $('deploy').textContent = 'Deployment finalized'
    $<HTMLButtonElement>('deploy').disabled = true
  } catch (error) { errorText(error) }
}
(async () => {
  state.sha = await sha256(CONTRACT_SOURCE)
  $('source-sha').textContent = state.sha
  $('source-bytes').textContent = String(new TextEncoder().encode(CONTRACT_SOURCE).length)
  write('READY', { chainId: CHAIN_ID, chainHex: CHAIN_HEX, sponsor: SPONSOR, sourceSha256: state.sha, expectedSourceSha256: '5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b', sourceMatchesExpected: state.sha === '5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b' })
  try { await discoverProviders() } catch (error) { errorText(error) }
})()
providerSelect.addEventListener('change', () => {
  const candidate = state.candidates[Number(providerSelect.value)]
  if (!candidate) return
  state.candidate = candidate
  state.provider = candidate.provider
  state.address = ''
  state.chain = ''
  $('wallet').textContent = 'provider changed; connect again'
  refreshButtons()
  write('PROVIDER SELECTED', { provider: candidate.label })
})
$('connect').addEventListener('click', connect)
$('estimate').addEventListener('click', estimate)
$('deploy').addEventListener('click', deploy)
