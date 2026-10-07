import { createClient, isSuccessful } from 'genlayer-js'
import { studioDevnet } from 'genlayer-js/chains'
import { TransactionHashVariant, type CalldataEncodable } from 'genlayer-js/types'

export const CONTRACT_ADDRESS = '0x897a7dF67E638506557985FE795Ff2F762f01607' as `0x${string}`
export const CHAIN_ID = 61997
export const CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`
export const RPC_URL = 'https://studio-dev.genlayer.com/api'
export const SOURCE_SHA256 = '5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b'
export const SPONSOR = '0xa35dc047f9937bf668743efbdf8ea93b31a55888'
export const LIVE_CHALLENGE_ID = 'reprobond-steward-consolidated-20261007-b'
export const LIVE_REPLICATION_ID = 'e7de30481ab0395935d39da02f39be5f748a24fb8fb4a329470d4dc51ceca11e'
export const LIVE_REPLICATOR = '0x30fd7e8539a8462591e62894739c6864e9b81fa2'
export const LIVE_METHODOLOGY_URL = 'https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md'
export const LIVE_METHODOLOGY_HASH = 'c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac'
export const LIVE_BASELINE = [100, 100, 100, 100, 100]
export const LIVE_CANDIDATE = [75, 75, 75, 75, 75]
export const REWARD_WEI = 1000000000000n
export const ZERO = 0n

export type Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
  isRabby?: boolean
  _isRabby?: boolean
  isMetaMask?: boolean
}

declare global {
  interface Window { ethereum?: Provider & { providers?: Provider[] } }
}

export type RecordValue = Record<string, any>
export type FeeEstimate = { distribution: Record<string, any>; messageAllocations?: any[]; feeValue: bigint }
export type FinalizedWrite = { hash: string; estimate: FeeEstimate; decided: any; finalized: any }

export const readClient = createClient({ chain: studioDevnet })
const readOptions = { transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL, jsonSafeReturn: true }

function selectedProvider(): Provider | null {
  const injected = window.ethereum
  if (!injected) return null
  const providers = Array.isArray(injected.providers) ? injected.providers.filter(Boolean) : [injected]
  return providers.find((item) => item.isRabby || item._isRabby) || providers.find((item) => item.isMetaMask) || providers[0] || null
}

export function getProvider(): Provider | null { return selectedProvider() }
export function sameAddress(a: unknown, b: unknown) { return String(a || '').toLowerCase() === String(b || '').toLowerCase() }

export function serializeError(value: unknown, seen = new WeakSet<object>(), depth = 0): any {
  if (value === null || value === undefined || typeof value !== 'object') return value
  if (depth > 7 || seen.has(value)) return depth > 7 ? '[MaxDepth]' : '[Circular]'
  seen.add(value)
  const output: Record<string, any> = {}
  const keys = new Set(['name', 'message', 'code', 'shortMessage', 'details', 'stack', 'data', 'cause', ...Object.keys(value), ...Object.getOwnPropertyNames(value)])
  for (const key of keys) {
    try { if (key in value) output[key] = serializeError((value as any)[key], seen, depth + 1) } catch { output[key] = '[Unserializable]' }
  }
  return output
}

export function errorMessage(value: unknown): string {
  const item = serializeError(value)
  if (typeof item === 'string') return item
  return String(item?.shortMessage || item?.message || item?.details || 'Unknown GenLayer error')
}

export async function walletAccounts(provider = getProvider()): Promise<string[]> {
  if (!provider) return []
  const value = await provider.request({ method: 'eth_accounts' })
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export async function walletChain(provider = getProvider()): Promise<string | null> {
  if (!provider) return null
  return String(await provider.request({ method: 'eth_chainId' })).toLowerCase()
}

export async function connectWallet(): Promise<{ provider: Provider; address: string; chainId: string }> {
  const provider = getProvider()
  if (!provider) throw new Error('No injected EIP-1193 wallet provider was found.')
  await provider.request({ method: 'eth_requestAccounts' })
  const before = await walletChain(provider)
  if (before !== CHAIN_HEX) {
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] })
    } catch (error) {
      const item = serializeError(error)
      const code = item?.code || item?.data?.originalError?.code
      if (code !== 4902 && code !== '4902') throw error
      await provider.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: CHAIN_HEX,
        chainName: 'GenLayer Studio Devnet',
        nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
        rpcUrls: [RPC_URL],
      }] })
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] })
    }
  }
  const chainId = await walletChain(provider)
  if (chainId !== CHAIN_HEX) throw new Error(`Wallet remains on the wrong network. Studio Dev chain ${CHAIN_ID} is required.`)
  const address = (await walletAccounts(provider))[0]
  if (!address) throw new Error('Wallet did not return an account.')
  return { provider, address, chainId }
}

export function watchWallet(onAccounts: (address: string | null) => void, onChain: (chain: string) => void) {
  const provider = getProvider()
  if (!provider?.on) return () => undefined
  const accounts = (...args: unknown[]) => onAccounts(Array.isArray(args[0]) && typeof args[0][0] === 'string' ? args[0][0] : null)
  const chain = (...args: unknown[]) => onChain(String(args[0] || '').toLowerCase())
  provider.on('accountsChanged', accounts)
  provider.on('chainChanged', chain)
  return () => { provider.removeListener?.('accountsChanged', accounts); provider.removeListener?.('chainChanged', chain) }
}

export async function readChallenge(id = LIVE_CHALLENGE_ID): Promise<RecordValue> {
  return await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_challenge', args: [id], ...readOptions }) as RecordValue
}

export async function readReplicationIds(id = LIVE_CHALLENGE_ID): Promise<string[]> {
  const value = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_challenge_replication_ids', args: [id], ...readOptions })
  return Array.isArray(value) ? value.map(String) : []
}

export async function readReplication(challengeId = LIVE_CHALLENGE_ID, replicationId = LIVE_REPLICATION_ID): Promise<RecordValue | null> {
  try { return await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_replication', args: [challengeId, replicationId], ...readOptions }) as RecordValue }
  catch { return null }
}

export async function readReplicationHistory(challengeId = LIVE_CHALLENGE_ID, replicationId = LIVE_REPLICATION_ID): Promise<RecordValue[]> {
  try {
    const value = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_replication_history', args: [challengeId, replicationId], ...readOptions })
    return Array.isArray(value) ? value as RecordValue[] : []
  } catch { return [] }
}

export async function readBalances() {
  const [contract, sponsor, replicator] = await Promise.all([
    readClient.getBalance({ address: CONTRACT_ADDRESS, blockTag: 'latest' }),
    readClient.getBalance({ address: SPONSOR, blockTag: 'latest' }),
    readClient.getBalance({ address: LIVE_REPLICATOR, blockTag: 'latest' }),
  ])
  return { contract: BigInt(contract), sponsor: BigInt(sponsor), replicator: BigInt(replicator) }
}

export async function readChallengeState(challengeId: string) {
  const challenge = await readChallenge(challengeId)
  const ids = await readReplicationIds(challengeId)
  const replications = (await Promise.all(ids.map(async (replicationId) => { try { return await readReplication(challengeId, replicationId) } catch { return null } }))).filter(Boolean) as RecordValue[]
  return { challenge, ids, replications }
}

export async function readLiveState() {
  const challenge = await readChallenge()
  const ids = await readReplicationIds()
  const replication = ids.some((id) => id.toLowerCase() === LIVE_REPLICATION_ID) ? await readReplication() : null
  const balances = await readBalances()
  return { challenge, ids, replication, balances }
}

export async function writeAndFinalize(account: string, functionName: string, args: CalldataEncodable[], value = ZERO, onSubmitted?: (hash: string) => void): Promise<FinalizedWrite> {
  const provider = getProvider()
  if (!provider) throw new Error('No injected EIP-1193 wallet provider was found.')
  const chain = await walletChain(provider)
  if (chain !== CHAIN_HEX) throw new Error(`Studio Dev chain ${CHAIN_ID} is required before writing.`)
  const client = createClient({ chain: studioDevnet, account: account as `0x${string}`, provider: provider as any }) as any
  const estimate = await client.estimateTransactionFeesForWrite({ address: CONTRACT_ADDRESS, functionName, args, value }) as FeeEstimate
  if (!estimate?.distribution || BigInt(estimate.feeValue) <= 0n) throw new Error('Studio Dev returned an unusable fee estimate; refusing to submit.')
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
    fees: { distribution: estimate.distribution, messageAllocations: estimate.messageAllocations, feeValue: estimate.feeValue },
  }) as string
  onSubmitted?.(hash)
  const decided = await client.waitForTransactionReceipt({ hash, waitUntil: 'decided', interval: 2000, retries: 180, fullTransaction: true })
  const finalized = await client.waitForTransactionReceipt({ hash, waitUntil: 'finalized', interval: 2000, retries: 300, fullTransaction: true })
  if (!isSuccessful(finalized)) {
    const execution = finalized?.txExecutionResultName || finalized?.execution_result || 'unknown execution result'
    throw new Error(`GenLayer execution failed: ${execution}`)
  }
  return { hash, estimate, decided, finalized }
}

export function formatGen(wei: bigint, decimals = 6) {
  const negative = wei < 0n
  const value = negative ? -wei : wei
  const base = 1000000000000000000n
  const whole = value / base
  const fraction = value % base
  const fractionText = fraction.toString().padStart(18, '0').slice(0, decimals).replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole.toString()}${fractionText ? `.${fractionText}` : ''} GEN`
}

export function short(value: unknown, left = 8, right = 6) {
  const text = String(value || '')
  return text.length > left + right + 1 ? `${text.slice(0, left)}…${text.slice(-right)}` : text || '—'
}
