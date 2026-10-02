import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CHAIN_HEX,
  CHAIN_ID,
  CONTRACT_ADDRESS,
  LIVE_BASELINE,
  LIVE_CANDIDATE,
  LIVE_CHALLENGE_ID,
  LIVE_METHODOLOGY_HASH,
  LIVE_METHODOLOGY_URL,
  LIVE_REPLICATOR,
  LIVE_REPLICATION_ID,
  REWARD_WEI,
  SOURCE_SHA256,
  SPONSOR,
  connectWallet,
  errorMessage,
  formatGen,
  getProvider,
  readBalances,
  readChallenge,
  readChallengeState,
  readReplication,
  readLiveState,
  readReplicationHistory,
  readReplicationIds,
  sameAddress,
  serializeError,
  short,
  walletAccounts,
  walletChain,
  watchWallet,
  writeAndFinalize,
} from './genlayer'

type RecordValue = Record<string, any>
type LiveState = Awaited<ReturnType<typeof readLiveState>>
type ChallengeState = Awaited<ReturnType<typeof readChallengeState>>
type ReplicationState = { challenge: RecordValue; replication: RecordValue | null; history: RecordValue[] }

const LIVE_CLAIM = 'Optimization X improves mean runtime by at least 20 percent for fixed-demo-workload-v1.'
const LIVE_CRITERIA = [
  { criterion_id: 'environment', requirement: 'The public evidence artifact states Linux x86_64 was used for the benchmark, with Studio Dev chain 61997 and genlayer-js 2.0.0-rc.1 recorded only as adjudication metadata; the SDK version is not a benchmark-execution requirement.', semantics: 'HARD' },
  { criterion_id: 'trial_count', requirement: 'Exactly five baseline and five candidate trials are submitted as raw integer arrays.', semantics: 'HARD' },
  { criterion_id: 'analysis_method', requirement: 'Use candidate_relative_change_bps.v1 from the raw arrays and do not choose a result label manually.', semantics: 'HARD' },
  { criterion_id: 'correctness_check', requirement: 'The raw arrays are bounded and the evidence is fetched from the committed HTTPS URL.', semantics: 'HARD' },
]
const LIVE_EVIDENCE_REQUIREMENTS = [{ evidence_id: 'methodology', requirement: 'A public methodology artifact identifies the benchmark environment, five-trial protocol, frozen analysis method, and committed evidence binding.', required: true }]

const AUDIT_TRANSACTIONS = [
  ['Create challenge', '0x4b56c9c76ca972ba23fcf1680b45d3b7727e95ddedf015b46b1ee9daf59ab35b'],
  ['Fund challenge', '0xcb7cffd17604e0bf28be72c8b480a4e41929d0e94b13350e74c3941c04c8957a'],
  ['Activate challenge', '0x1afc32359c4d54f7fbdb167cde04fc377b9c7e5f3144142de5a0aeaf1e84394c'],
  ['Submit replication', '0xc487364a7fb62b1ccbe4056272b7a061af5b854bf7cc84b11b653e846c760923'],
  ['Adjudicate replication', '0x6d041228ae9b9bb5fae4702f401abc09c66392ebe0c42dfd10feaf4cf6c804f6'],
  ['Settle replication', '0xb6aa058fe968762a0ee709ccc658e47486dc1fbec070042db2f6b520e90b7dbd'],
  ['Native payout child transfer', '0x949b930114ddbfcd1945002515dad7a0b64f16445f499e168699325e75b28d13'],
]

type WalletContextValue = {
  address: string | null
  chainId: string | null
  provider: boolean
  connect: () => Promise<void>
  switchNetwork: () => Promise<void>
}

const WalletContext = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const provider = Boolean(getProvider())

  const sync = useCallback(async () => {
    const p = getProvider()
    if (!p) return
    try { setAddress((await walletAccounts(p))[0] || null); setChainId(await walletChain(p)) } catch { setAddress(null); setChainId(null) }
  }, [])

  useEffect(() => {
    void sync()
    return watchWallet(setAddress, setChainId)
  }, [sync])

  const connect = useCallback(async () => { const next = await connectWallet(); setAddress(next.address); setChainId(next.chainId) }, [])
  const switchNetwork = useCallback(async () => { const next = await connectWallet(); setAddress(next.address); setChainId(next.chainId) }, [])
  return <WalletCtx.Provider value={{ address, chainId, provider, connect, switchNetwork }}>{children}</WalletCtx.Provider>
}

const WalletCtx = createContext<WalletContextValue | null>(null)

function useWallet() {
  const value = useContext(WalletCtx)
  if (!value) throw new Error('Wallet context is unavailable.')
  return value
}

function useAsyncState<T>(loader: () => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => { setLoading(true); try { setData(await loader()); setError('') } catch (nextError) { setError(errorMessage(nextError)) } finally { setLoading(false) } }, dependencies)
  useEffect(() => { void refresh() }, [refresh])
  return { data, loading, error, refresh }
}
function useLiveState() { return useAsyncState(readLiveState, []) }
function useChallengeState(challengeId: string) { return useAsyncState(() => readChallengeState(challengeId), [challengeId]) }
function useReplicationState(challengeId: string, replicationId: string) { return useAsyncState(async () => ({ challenge: await readChallenge(challengeId), replication: await readReplication(challengeId, replicationId), history: await readReplicationHistory(challengeId, replicationId) }), [challengeId, replicationId]) }

function useWrite(refresh: () => Promise<void>) {
  const { address, chainId } = useWallet()
  const [status, setStatus] = useState<{ stage: string; message: string; hash?: string; error?: string }>({ stage: 'idle', message: '' })
  const run = useCallback(async (method: string, args: any[], value = 0n) => {
    if (!address) throw new Error('Connect a wallet before signing.')
    if (chainId !== CHAIN_HEX) throw new Error(`Studio Dev chain ${CHAIN_ID} is required before signing.`)
    setStatus({ stage: 'estimating', message: 'Refreshing GenLayer fee profile…' })
    try {
      const result = await writeAndFinalize(address, method, args, value, (hash) => setStatus({ stage: 'finalizing', message: 'Transaction submitted; waiting for finalization…', hash }))
      setStatus({ stage: 'confirmed', message: 'Finalized and successful.', hash: result.hash })
      await refresh()
      return result
    } catch (nextError) {
      const serialized = serializeError(nextError)
      setStatus({ stage: 'failed', message: errorMessage(nextError), error: JSON.stringify(serialized) })
      throw nextError
    }
  }, [address, chainId, refresh])
  return { run, status }
}

function App() {
  return <BrowserRouter><WalletContext><Shell /></WalletContext></BrowserRouter>
}

function Shell() {
  const location = useLocation()
  const { address, chainId, provider, connect, switchNetwork } = useWallet()
  const networkOk = chainId === CHAIN_HEX
  return <div className="app-shell">
    <header className="site-header">
      <Link to="/" className="brand"><img className="brand-mark" src="/reprobond-mark.svg" alt="" /><span><strong>REPROBOND</strong><small>REPLICATION PROTOCOL</small></span></Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/challenges">Challenges</NavLink>
        <NavLink to="/audit">Live proof</NavLink>
        <NavLink to="/create">Create</NavLink>
        <NavLink to="/submit">Replicate</NavLink>
      </nav>
      <div className="header-actions">
        <span className={`network-pill ${networkOk ? 'online' : 'offline'}`}><b />{networkOk ? 'STUDIO DEV 61997' : 'CHAIN REQUIRED'}</span>
        <button className="wallet-button" onClick={() => void (address ? (networkOk ? Promise.resolve() : switchNetwork()) : connect())}>{address ? short(address, 7, 5) : provider ? 'Connect wallet' : 'Wallet unavailable'}</button>
      </div>
    </header>
    <main className="site-main"><Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/challenges" element={<Challenges />} />
      <Route path="/challenges/:id" element={<ChallengeDetail />} />
      <Route path="/replications/:challengeId/:replicationId" element={<ReplicationDetail />} />
      <Route path="/replications/:id" element={<LegacyReplicationDetail />} />
      <Route path="/create" element={<CreateChallenge />} />
      <Route path="/submit" element={<SubmitReplication />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="*" element={<Home />} />
    </Routes></main>
    <footer className="site-footer"><span>REPROBOND / V1 PROTOCOL</span><span>Faithful replication gets paid. Even when the result disagrees.</span><a href={`https://explorer-studio-dev.genlayer.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract ↗</a></footer>
  </div>
}

function PageIntro({ marker, title, copy, action }: { marker: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="page-intro"><div><span className="marker">{marker}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{action && <div className="intro-action">{action}</div>}</div>
}

function ProofStack() {
  return <div className="proof-stack">
    <span className="proof-kicker">LIVE REPLICATION / 01</span>
    <div className="proof-line"><span>FIDELITY</span><strong>PASS</strong></div>
    <div className="proof-line metric"><span>DERIVED METRIC</span><strong>-2500 <em>BPS</em></strong></div>
    <div className="proof-line result"><span>RESULT DIRECTION</span><strong>CONTRADICTS</strong></div>
    <div className="proof-line paid"><span>SETTLEMENT</span><strong>PAID</strong></div>
    <p>One immutable replication. Public evidence. A deterministic result. The direction never changes the reward.</p>
  </div>
}

function Home() {
  const live = useLiveState()
  const challenge = live.data?.challenge
  return <>
    <section className="hero-grid">
      <div className="hero-copy"><span className="marker">ON-CHAIN RESEARCH PROTOCOL / STUDIO DEV</span><h1>Faithful replication gets paid.<br /><i>Even when the result disagrees.</i></h1><p className="hero-lede">ReproBond turns reproducibility into a verifiable economic primitive. Sponsors freeze a quantitative protocol. Independent replicators follow it. GenLayer checks the evidence; deterministic code keeps the result and reward honest.</p><div className="hero-actions"><Link className="button button-dark" to="/create">Create a challenge <span>→</span></Link><Link className="button button-quiet" to="/submit">Replicate a challenge <span>→</span></Link></div></div>
      <ProofStack />
    </section>
    <section className="section-band intro-band"><div className="section-number">01 / THE PREMISE</div><div className="band-copy"><h2>Consensus for the part humans must read. Determinism for the part money must obey.</h2><p>A model does not decide whether a benchmark improved. It evaluates whether the replication followed the frozen protocol and whether its evidence is bound. The contract calculates <span className="mono">-2500 bps</span> from raw arrays, classifies <span className="mono">CONTRADICTS</span>, and pays because fidelity passed.</p></div></section>
    <section className="case-study"><div className="case-meta"><span className="marker">FEATURED LIVE CASE</span><span className="mono">{LIVE_CHALLENGE_ID}</span></div><div className="case-grid"><div><h2>Optimization X was not confirmed.</h2><p>The replication used five baseline runs and five candidate runs: <span className="mono">100</span> vs <span className="mono">75</span>. The result disagreed with the claim. The methodology still satisfied every frozen criterion.</p><Link className="text-link" to={`/replications/${LIVE_CHALLENGE_ID}/${LIVE_REPLICATION_ID}`}>Open replication dossier →</Link></div><div className="case-number"><span>REWARD / QUALIFIED REPLICATION</span><strong>{formatGen(REWARD_WEI)}</strong><small>CONTRADICTS did not reduce it.</small></div></div></section>
    <section className="section-band process-band"><div className="section-number">02 / HOW IT WORKS</div><div className="process-grid"><ProcessStep n="01" title="Freeze" copy="Claim, criteria, evidence, metric, thresholds, slots, reward, deadline." /><ProcessStep n="02" title="Replicate" copy="Independent wallet submits a bounded manifest and raw quantitative values." /><ProcessStep n="03" title="Adjudicate" copy="GenLayer validators independently inspect the same public evidence." /><ProcessStep n="04" title="Settle" copy="PASS earns the exact reward. Direction never enters the payout gate." /></div></section>
    <section className="limit-note"><span className="marker">SCOPE, NOT SCIENTIFIC TRUTH</span><p>ReproBond reports whether a replication followed its preregistered protocol and what the deterministic metric says. It does not claim to prove a universal scientific truth.</p><Link className="text-link" to="/audit">See the evidence trail →</Link></section>
    {challenge && <div className="sr-only">Authoritative live state {String(challenge.state)}</div>}
  </>
}

function ProcessStep({ n, title, copy }: { n: string; title: string; copy: string }) { return <div className="process-step"><span>{n}</span><h3>{title}</h3><p>{copy}</p></div> }

function StateTag({ value }: { value: unknown }) { const text = String(value || '—'); return <span className={`state-tag ${text.toLowerCase().replaceAll('_', '-')}`}>{text.replaceAll('_', ' ')}</span> }

function Loading({ text = 'Reading Studio Dev…' }: { text?: string }) { return <div className="loading"><span className="loader" />{text}</div> }
function ReadState({ live, state, children }: { live?: ReturnType<typeof useLiveState>; state?: { data: any; loading: boolean; error: string; refresh: () => Promise<void> }; children: (data: any) => ReactNode }) { const current = state || live; if (!current) return null; if (current.loading && !current.data) return <Loading />; if (current.error && !current.data) return <div className="error-box"><strong>Authoritative read unavailable</strong><span>{current.error}</span><button className="button button-quiet" onClick={() => void current.refresh()}>Retry</button></div>; return current.data ? <>{children(current.data)}</> : null }

function Challenges() {
  const live = useLiveState()
  const navigate = useNavigate()
  const [lookup, setLookup] = useState('')
  return <ReadState live={live}>{({ challenge }) => <>
    <PageIntro marker="01 / CHALLENGES" title="Frozen questions, open replication slots." copy="Every challenge is a public record. Protocol criteria, evidence requirements, reward pool, and result vocabulary are fixed before replication begins." action={<Link className="button button-dark" to="/create">Create a challenge →</Link>} />
    <section className="challenge-list"><Link to={'/challenges/' + LIVE_CHALLENGE_ID} className="challenge-row"><div className="row-index">01</div><div><span className="marker">CANONICAL / STUDIO DEV 61997</span><h2>{String(challenge.challenge_id)}</h2><p>{String(challenge.claim || LIVE_CLAIM)}</p></div><div className="row-facts"><span><b>STATE</b><StateTag value={challenge.state} /></span><span><b>ESCROW</b>{formatGen(BigInt(challenge.escrow_funded || 0))}</span><span><b>SLOTS</b>{String(challenge.qualified_count || 0)} / {String(challenge.required_slot_count || 0)}</span></div><span className="row-arrow">↗</span></Link></section>
    <section className="lookup-panel"><span className="marker">OPEN A CHALLENGE BY ID</span><div><input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="challenge identifier" /><button className="button button-outline" disabled={!lookup.trim()} onClick={() => navigate('/challenges/' + encodeURIComponent(lookup.trim()))}>Inspect record →</button></div><p>Challenge lookup is authoritative. The app never invents a global directory the deployed contract does not expose.</p></section>
  </>}</ReadState>
}

function ChallengeDetail() {
  const { id = LIVE_CHALLENGE_ID } = useParams()
  const state = useChallengeState(id)
  return <ReadState state={state}>{({ challenge, ids, replications }: ChallengeState) => (
    <>
      <PageIntro marker="CHALLENGE DOSSIER / AUTHORITATIVE" title={String(challenge.challenge_id)} copy={String(challenge.claim || LIVE_CLAIM)} action={<Link className="button button-quiet" to="/submit">Submit a replication →</Link>} />
      <div className="detail-meta">
        <Meta label="STATE"><StateTag value={challenge.state} /></Meta>
        <Meta label="ESCROW" value={formatGen(BigInt(challenge.escrow_funded || 0))} />
        <Meta label="SLOTS" value={String(challenge.qualified_count || 0) + ' / ' + String(challenge.required_slot_count || 0)} />
        <Meta label="REWARD" value={formatGen(BigInt(challenge.reward_per_replication || 0))} />
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <SectionTitle n="01" title="Frozen protocol criteria" />
          <div className="criteria-list">{arr(challenge.protocol_criteria, LIVE_CRITERIA).map((item: any) => <div className="criterion" key={item.criterion_id}><span className="criterion-id">{item.criterion_id}</span><div><strong>{item.requirement}</strong><small>{item.semantics} requirement</small></div></div>)}</div>
          <SectionTitle n="02" title="Evidence requirement" />
          <div className="evidence-list">{arr(challenge.evidence_requirements, LIVE_EVIDENCE_REQUIREMENTS).map((item: any) => <div className="evidence-item" key={item.evidence_id}><span className="criterion-id">{item.evidence_id}</span><div><strong>{item.requirement}</strong><small>{item.required ? 'REQUIRED' : 'OPTIONAL'}</small></div></div>)}</div>
          <SectionTitle n="03" title="Deterministic result law" />
          <div className="law-card"><div><span className="marker">METRIC</span><strong>{String(challenge.metric_definition)}</strong></div><div><span className="marker">SUPPORT THRESHOLD</span><strong>+{String(challenge.support_threshold_bps)} bps</strong></div><div><span className="marker">CONTRADICTION THRESHOLD</span><strong>{String(challenge.contradiction_threshold_bps)} bps</strong></div><p>Result direction is derived from raw integer runs. It never independently controls payout.</p></div>
          <SectionTitle n="04" title="Replication records" />
          <div className="challenge-replications">{replications.length ? replications.map((replication: any) => <Link className="challenge-row compact" key={replication.replication_id} to={'/replications/' + encodeURIComponent(id) + '/' + encodeURIComponent(replication.replication_id)}><div className="row-index">↳</div><div><span className="marker">{short(replication.replicator, 10, 8)}</span><h2>{short(replication.replication_id, 14, 10)}</h2></div><div className="row-facts"><span><b>STATE</b><StateTag value={replication.state} /></span><span><b>RESULT</b><StateTag value={replication.result_direction || 'PENDING'} /></span></div><span className="row-arrow">↗</span></Link>) : <p className="muted-copy">No replication records are stored yet. Independent wallets can use the replication form while this challenge is OPEN.</p>}</div>
        </div>
        <aside className="detail-aside">
          <div className="side-card"><span className="marker">REPLICATION SLOTS</span><div className="slot-rail">{Array.from({ length: Number(challenge.required_slot_count || 0) }, (_, index) => <span className={index < Number(challenge.qualified_count || 0) ? 'filled' : ''} key={index}>{String(index + 1).padStart(2, '0')}</span>)}</div><p>{ids.length} record(s) submitted. {Number(challenge.required_slot_count || 0) - Number(challenge.qualified_count || 0)} qualified slot(s) remain open.</p></div>
          <div className="side-card"><span className="marker">AGGREGATE</span><strong className="aggregate-value">{String(challenge.aggregate_result || 'NOT_READY').replaceAll('_', ' ')}</strong><p>Aggregate vocabulary describes replication directions. It does not label the original claim true or false.</p></div>
        </aside>
      </div>
    </>
  )}</ReadState>
}
function ReplicationDetail() {
  const params = useParams()
  const challengeId = params.challengeId || LIVE_CHALLENGE_ID
  const replicationId = params.replicationId || LIVE_REPLICATION_ID
  const state = useReplicationState(challengeId, replicationId)
  const { address, chainId } = useWallet()
  const writer = useWrite(state.refresh)
  return <ReadState state={state}>{({ challenge, replication, history }: ReplicationState) => {
    if (!replication) return <div className="error-box"><strong>Replication record unavailable</strong><span>Check the challenge ID and replication ID, then retry the authoritative read.</span></div>
    const criteria = arr(replication.criteria, [])
    const canWrite = Boolean(address) && chainId === CHAIN_HEX
    const settleAllowed = replication.state === 'PASS' && sameAddress(address, replication.replicator) && ['OPEN', 'COMPLETE', 'EXPIRED'].includes(String(challenge.state))
    return <>
      <PageIntro marker="REPLICATION DOSSIER / IMMUTABLE RECORD" title={short(replication.replication_id, 15, 10)} copy="The contract stores the manifest, raw packet, fidelity record, deterministic result, and payout fingerprint as one auditable replication revision." action={<StateTag value={replication.state} />} />
      <div className="detail-meta"><Meta label="CHALLENGE" value={short(challenge.challenge_id, 12, 8)} /><Meta label="REPLICATOR" value={short(replication.replicator, 10, 8)} /><Meta label="REVISION" value={String(replication.revision)} /><Meta label="FIDELITY"><StateTag value={replication.fidelity_status || replication.state} /></Meta></div>
      <div className="replication-proof"><div className="proof-banner"><span className="marker">THE DEFINING OUTCOME</span><strong>PASS + CONTRADICTS → PAID</strong><p>Faithfulness controls the reward. Result direction is a separate deterministic record.</p></div><div className="replication-grid"><div><SectionTitle n="01" title="Evidence binding" /><div className="manifest-block">{arr(replication.manifest, []).map((item: any) => <div key={item.evidence_id}><span className="marker">{item.evidence_id}</span><a href={item.url} target="_blank" rel="noreferrer">{item.url}</a><code>{item.sha256}</code></div>)}</div><SectionTitle n="02" title="Raw quantitative packet" /><div className="runs-grid"><RunList label="BASELINE RUNS" values={replication.baseline_runs} /><RunList label="CANDIDATE RUNS" values={replication.candidate_runs} /></div><SectionTitle n="03" title="GenLayer fidelity" /><div className="criteria-list">{criteria.map((item: any) => <div className="criterion" key={item.criterion_id}><span className="criterion-id">{item.criterion_id}</span><div><strong>{item.status}</strong><small>Frozen criterion result</small></div><StateTag value={item.status} /></div>)}</div></div><aside className="detail-aside"><div className="result-card"><span className="marker">DETERMINISTIC METRIC</span><strong>{String(replication.relative_change_bps ?? '—')} <em>BPS</em></strong><span className="marker">RESULT DIRECTION</span><b>{String(replication.result_direction || 'PENDING')}</b><hr /><span className="marker">REWARD</span><strong>{formatGen(BigInt(challenge.reward_per_replication || REWARD_WEI))}</strong><p>Exact reward entitlement is independent of result direction.</p></div><div className="side-card"><span className="marker">REVISION HISTORY</span><strong>{String(replication.history_length || history.length || 0)} prior revision(s)</strong><p>Historical manifests are preserved. Current state: {String(replication.state)}.</p></div>{replication.state === 'SUBMITTED' && <button className="button button-dark full" disabled={!canWrite || writer.status.stage !== 'idle'} onClick={() => void writer.run('adjudicate_replication', [challengeId, replicationId])}>Adjudicate replication</button>}{replication.state === 'PASS' && <button className="button button-dark full" disabled={!settleAllowed || writer.status.stage !== 'idle'} onClick={() => void writer.run('settle_replication', [challengeId, replicationId])}>Settle exact reward</button>}{replication.state === 'PASS' && !settleAllowed && <p className="muted-copy">Settlement is restricted to the stored replicator wallet on an eligible challenge state.</p>}{writer.status.stage !== 'idle' && <TxNotice status={writer.status} />}</aside></div></div>
    </>
  }}</ReadState>
}
function LegacyReplicationDetail() { const { id } = useParams(); return <ReplicationRedirect id={id || LIVE_REPLICATION_ID} /> }
function ReplicationRedirect({ id }: { id: string }) { const navigate = useNavigate(); useEffect(() => { navigate('/replications/' + LIVE_CHALLENGE_ID + '/' + id, { replace: true }) }, [id, navigate]); return <Loading text="Opening replication dossier…" /> }

function SubmitReplication() {
  const { address, chainId } = useWallet()
  const [challengeId, setChallengeId] = useState(LIVE_CHALLENGE_ID)
  const state = useChallengeState(challengeId.trim() || LIVE_CHALLENGE_ID)
  const writer = useWrite(state.refresh)
  const [manifestText, setManifestText] = useState(JSON.stringify([{ evidence_id: 'methodology', url: LIVE_METHODOLOGY_URL, sha256: LIVE_METHODOLOGY_HASH }], null, 2))
  const [baselineText, setBaselineText] = useState(LIVE_BASELINE.join(','))
  const [candidateText, setCandidateText] = useState(LIVE_CANDIDATE.join(','))
  const [localError, setLocalError] = useState('')
  const [submittedId, setSubmittedId] = useState('')
  const challenge = state.data?.challenge as RecordValue | undefined
  const parsed = parseRuns(baselineText, candidateText)
  const preview = challenge && parsed ? metricPreview(parsed.baseline, parsed.candidate, Number(challenge.support_threshold_bps), Number(challenge.contradiction_threshold_bps)) : null
  const submit = async () => {
    setLocalError('')
    try {
      if (!challenge || challenge.state !== 'OPEN') throw new Error('Challenge must be authoritatively OPEN.')
      if (!address || sameAddress(address, challenge.sponsor)) throw new Error('The sponsor cannot submit a replication. Switch to an independent wallet.')
      if (chainId !== CHAIN_HEX) throw new Error('Studio Dev chain ' + CHAIN_ID + ' is required.')
      const ids = state.data?.ids || []
      if (ids.length >= Number(challenge.required_slot_count)) throw new Error('All replication slots are occupied.')
      if (!parsed) throw new Error('Raw arrays must contain 2–16 non-negative integers within the contract bound.')
      const manifest = validateManifest(manifestText, challenge.evidence_requirements)
      await writer.run('submit_replication', [challengeId.trim(), manifest, parsed.baseline, parsed.candidate])
      const fresh = await readChallengeState(challengeId.trim())
      const latest = fresh.ids.filter((item) => !ids.includes(item))
      setSubmittedId(latest[latest.length - 1] || 'submitted; refresh the challenge record to open the new ID')
    } catch (error) { setLocalError(errorMessage(error)) }
  }
  return <ReadState state={state}>{({ challenge: current }: ChallengeState) => <>
    <PageIntro marker="03 / REPLICATE" title="Bring the protocol, not a preferred answer." copy="Submit immutable public evidence and bounded raw values. The result label is derived by the contract; there is no result field to choose." action={<Link className="button button-quiet" to={'/challenges/' + encodeURIComponent(challengeId)}>Inspect frozen challenge →</Link>} />
    <div className="form-layout"><section className="form-surface"><label><span className="marker">CHALLENGE ID</span><input value={challengeId} onChange={(event) => { setChallengeId(event.target.value); setSubmittedId('') }} placeholder="challenge identifier" /></label><div className="form-step"><span className="step-index">01</span><div><span className="marker">EVIDENCE MANIFEST</span><h2>Bind the public record</h2><p>Use HTTPS evidence with a commitment computed over Studio Dev rendered text, not raw transport bytes. Required evidence IDs are read from the authoritative challenge.</p></div></div><textarea className="code-input" value={manifestText} onChange={(event) => setManifestText(event.target.value)} rows={8} spellCheck={false} /><div className="form-step"><span className="step-index">02</span><div><span className="marker">RAW QUANTITATIVE PACKET</span><h2>Give the contract numbers</h2><p>Integer arrays only. No SUPPORTS, CONTRADICTS, or INCONCLUSIVE label is accepted as input.</p></div></div><label><span className="marker">BASELINE RUNS</span><input value={baselineText} onChange={(event) => setBaselineText(event.target.value)} /></label><label><span className="marker">CANDIDATE RUNS</span><input value={candidateText} onChange={(event) => setCandidateText(event.target.value)} /></label>{localError && <div className="inline-error">{localError}</div>}{submittedId && <div className="tx-notice good"><strong>Replication submitted.</strong><span>{submittedId.includes(';') ? submittedId : <Link to={'/replications/' + encodeURIComponent(challengeId) + '/' + encodeURIComponent(submittedId)}>Open the new replication record →</Link>}</span></div>}{writer.status.stage !== 'idle' && <TxNotice status={writer.status} />}{current?.state === 'OPEN' && <button className="button button-dark" disabled={!address || chainId !== CHAIN_HEX || sameAddress(address, current.sponsor) || writer.status.stage !== 'idle'} onClick={() => void submit()}>Submit replication <span>→</span></button>}</section><aside className="side-note"><span className="marker">LOCAL DERIVATION PREVIEW</span>{preview ? <><div className="preview-metric">{preview.metric} <em>BPS</em></div><StateTag value={preview.direction} /><p>This preview uses exact integer arithmetic. The contract recalculates it on-chain.</p></> : <p>Enter valid arrays to preview the deterministic metric.</p>}<hr /><span className="marker">CONNECTED ROLE</span><strong>{address ? sameAddress(address, current?.sponsor) ? 'SPONSOR — SUBMISSION BLOCKED' : short(address, 10, 8) : 'WALLET NOT CONNECTED'}</strong><p>{current ? 'State: ' + current.state + '. The challenge frozen criteria remain the source of truth.' : 'Load a challenge to inspect its frozen protocol.'}</p></aside></div>
  </>}
  </ReadState>
}

function CreateChallenge() {
  const { address, chainId } = useWallet()
  const [id, setId] = useState('')
  const [claim, setClaim] = useState('')
  const [criteria, setCriteria] = useState(JSON.stringify(LIVE_CRITERIA, null, 2))
  const [evidence, setEvidence] = useState(JSON.stringify(LIVE_EVIDENCE_REQUIREMENTS, null, 2))
  const [support, setSupport] = useState('2000')
  const [contradiction, setContradiction] = useState('-2000')
  const [slots, setSlots] = useState('3')
  const [reward, setReward] = useState('1000000000000')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')
  const [createdEscrow, setCreatedEscrow] = useState<bigint | null>(null)
  const createdState = useChallengeState(createdId || LIVE_CHALLENGE_ID)
  const created = createdState.data?.challenge as RecordValue | undefined
  const writer = useWrite(createdState.refresh)
  const create = async () => {
    setError('')
    try {
      if (!address || chainId !== CHAIN_HEX) throw new Error('Connect the sponsor wallet on Studio Dev ' + CHAIN_ID + '.')
      if (!id.trim() || !claim.trim()) throw new Error('Challenge ID and claim are required.')
      const protocol = JSON.parse(criteria)
      const requirements = JSON.parse(evidence)
      if (!Array.isArray(protocol) || !protocol.length || !Array.isArray(requirements) || !requirements.length) throw new Error('Criteria and evidence requirements must be non-empty arrays.')
      const slotCount = Number(slots)
      const rewardWei = BigInt(reward)
      if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 16 || rewardWei <= 0n) throw new Error('Slots must be 1–16 and reward must be positive.')
      if (!Number.isInteger(Number(support)) || !Number.isInteger(Number(contradiction)) || Number(support) <= Number(contradiction)) throw new Error('Thresholds must be integers with support above contradiction.')
      const escrow = BigInt(slotCount) * rewardWei
      await writer.run('create_challenge', [id.trim(), claim.trim(), protocol, requirements, 'candidate_relative_change_bps.v1', Number(support), Number(contradiction), slotCount, rewardWei, deadline || new Date(Date.now() + 30 * 86400000).toISOString()])
      setCreatedId(id.trim())
      setCreatedEscrow(escrow)
    } catch (nextError) { setError(errorMessage(nextError)) }
  }
  const fund = async () => {
    setError('')
    try {
      if (!created || created.challenge_id !== createdId || created.state !== 'DRAFT') throw new Error('Authoritative challenge state must be DRAFT before funding.')
      if (!sameAddress(address, created.sponsor)) throw new Error('Only the stored sponsor can fund this challenge.')
      if (createdEscrow === null || BigInt(created.expected_escrow) !== createdEscrow) throw new Error('Escrow configuration changed; reload before funding.')
      await writer.run('fund_challenge', [createdId], createdEscrow)
    } catch (nextError) { setError(errorMessage(nextError)) }
  }
  const activate = async () => {
    setError('')
    try {
      if (!created || created.challenge_id !== createdId || created.state !== 'FUNDED') throw new Error('Authoritative challenge state must be FUNDED before activation.')
      if (!sameAddress(address, created.sponsor)) throw new Error('Only the stored sponsor can activate this challenge.')
      await writer.run('activate_challenge', [createdId])
    } catch (nextError) { setError(errorMessage(nextError)) }
  }
  return <><PageIntro marker="04 / SPONSOR WORKFLOW" title="Freeze a question worth reproducing." copy="A challenge is a compact public contract: claim, criteria, evidence, metric, thresholds, slots, reward, deadline. Every field becomes immutable after creation." /><div className="form-layout"><section className="form-surface"><label><span className="marker">CHALLENGE ID</span><input value={id} onChange={(event) => setId(event.target.value)} placeholder="e.g. runtime-benchmark-2026-a" /></label><label><span className="marker">CLAIM</span><textarea value={claim} onChange={(event) => setClaim(event.target.value)} rows={3} placeholder="Optimization X improves…" /></label><label><span className="marker">PROTOCOL CRITERIA / JSON</span><textarea className="code-input" value={criteria} onChange={(event) => setCriteria(event.target.value)} rows={10} spellCheck={false} /></label><label><span className="marker">EVIDENCE REQUIREMENTS / JSON</span><textarea className="code-input" value={evidence} onChange={(event) => setEvidence(event.target.value)} rows={6} spellCheck={false} /></label><div className="input-grid"><label><span className="marker">SUPPORT BPS</span><input value={support} onChange={(event) => setSupport(event.target.value)} inputMode="numeric" /></label><label><span className="marker">CONTRADICTION BPS</span><input value={contradiction} onChange={(event) => setContradiction(event.target.value)} inputMode="numeric" /></label><label><span className="marker">SLOTS</span><input value={slots} onChange={(event) => setSlots(event.target.value)} inputMode="numeric" /></label><label><span className="marker">REWARD / SLOT (WEI)</span><input value={reward} onChange={(event) => setReward(event.target.value)} inputMode="numeric" /></label></div><label><span className="marker">DEADLINE UTC</span><input value={deadline} onChange={(event) => setDeadline(event.target.value)} placeholder="2026-12-31T00:00:00Z" /></label>{error && <div className="inline-error">{error}</div>}{writer.status.stage !== 'idle' && <TxNotice status={writer.status} />}{createdId && <div className="tx-notice good"><strong>Challenge created: {createdId}</strong><span>{created ? 'Authoritative state: ' + created.state + '. Escrow: ' + formatGen(BigInt(created.escrow_funded || 0)) + '.' : 'Refreshing the new record…'}</span></div>}<div className="button-row"><button className="button button-dark" disabled={!address || chainId !== CHAIN_HEX || writer.status.stage !== 'idle'} onClick={() => void create()}>Create challenge</button><button className="button button-outline" disabled={!createdId || !created || created.state !== 'DRAFT' || writer.status.stage !== 'idle'} onClick={() => void fund()}>Fund exact escrow</button><button className="button button-outline" disabled={!createdId || !created || created.state !== 'FUNDED' || writer.status.stage !== 'idle'} onClick={() => void activate()}>Activate</button></div></section><aside className="side-note"><span className="marker">THE SPONSOR SEQUENCE</span><ol className="plain-steps"><li>Draft the immutable record</li><li>Fund every required slot</li><li>Activate for independent replication</li></ol><hr /><span className="marker">CONNECTED WALLET</span><strong>{address ? short(address, 10, 8) : 'NOT CONNECTED'}</strong><p>Creating a challenge records the connected wallet as sponsor. Funding requires the exact computed escrow, refreshed from authoritative state.</p></aside></div></>
}

function AuditPage() {
  const live = useLiveState()
  return <ReadState live={live}>{({ challenge, replication, balances }) => <><PageIntro marker="LIVE AUDIT / VERIFIED CASE STUDY" title="One replication. The whole mechanism." copy="The corrected Studio Dev challenge is the production proof: evidence passed, the measured result contradicted the claim, and the exact reward still moved." action={<a className="button button-dark" href={`https://github.com/Iniwura/reprobond/blob/main/docs/LIVE_AUDIT_FINAL.md`} target="_blank" rel="noreferrer">Open audit document ↗</a>} /><div className="audit-hero"><div><span className="marker">REPROBOND / {LIVE_CHALLENGE_ID}</span><h2>Fidelity is the gate.<br /><i>Not agreement.</i></h2><p>All four frozen criteria were satisfied. The contract derived <b>-2500 bps</b> from raw arrays, classified <b>CONTRADICTS</b>, and paid <b>1,000,000,000,000 wei</b>.</p></div><div className="audit-stamp"><strong>PASS</strong><span>−2500 bps</span><b>CONTRADICTS</b><em>PAID</em></div></div><div className="audit-grid"><div><SectionTitle n="01" title="Live chain state" /><div className="audit-facts"><Meta label="CONTRACT" value={short(CONTRACT_ADDRESS, 12, 10)} /><Meta label="CHAIN" value="Studio Dev / 61997" /><Meta label="CHALLENGE STATE" value={String(challenge.state)} /><Meta label="REMAINING POOL" value={formatGen(BigInt(challenge.escrow_funded || 0) - BigInt(challenge.paid_total || 0))} /></div><SectionTitle n="02" title="Transaction trail" /><div className="tx-list">{AUDIT_TRANSACTIONS.map(([label, hash]) => <a href={`https://explorer-studio-dev.genlayer.com/tx/${hash}`} target="_blank" rel="noreferrer" key={hash}><span>{label}</span><code>{short(hash, 14, 12)}</code><b>↗</b></a>)}</div><SectionTitle n="03" title="Replay protection" /><div className="replay-proof"><strong>NO SECOND PAYOUT</strong><p>The duplicate settlement was rejected during fee-estimation simulation with <code>only PASS replications can be paid.</code> No replay transaction was submitted; paid count stayed at 1 and balances were unchanged.</p></div></div><aside className="audit-aside"><div className="side-card"><span className="marker">EVIDENCE COMMITMENT</span><a className="url-block" href={LIVE_METHODOLOGY_URL} target="_blank" rel="noreferrer">{LIVE_METHODOLOGY_URL}</a><code>{LIVE_METHODOLOGY_HASH}</code></div><div className="side-card"><span className="marker">CRITERIA</span>{arr(replication?.criteria, LIVE_CRITERIA.map((item) => ({ criterion_id: item.criterion_id, status: 'SATISFIED' }))).map((item: any) => <div className="mini-status" key={item.criterion_id}><span>{item.criterion_id}</span><b>{item.status}</b></div>)}</div><div className="side-card"><span className="marker">AUTHORITATIVE BALANCES</span><div className="balance-row"><span>CONTRACT</span><b>{formatGen(BigInt(balances.contract))}</b></div><div className="balance-row"><span>REPLICATOR</span><b>{formatGen(BigInt(balances.replicator))}</b></div></div></aside></div></>}</ReadState>
}

function SectionTitle({ n, title }: { n: string; title: string }) { return <div className="section-title"><span>{n}</span><h2>{title}</h2></div> }
function Meta({ label, value, children }: { label: string; value?: ReactNode; children?: ReactNode }) { return <div className="meta-item"><span className="marker">{label}</span><strong>{children || value || '—'}</strong></div> }
function RunList({ label, values }: { label: string; values: unknown }) { const items = arr(values, []); return <div className="run-list"><span className="marker">{label}</span><div>{items.map((value, index) => <b key={index}>{String(value)}</b>)}</div></div> }
function TxNotice({ status }: { status: { stage: string; message: string; hash?: string; error?: string } }) { return <div className={`tx-notice ${status.stage === 'failed' ? 'bad' : status.stage === 'confirmed' ? 'good' : ''}`}><strong>{status.message}</strong>{status.hash && <code>{status.hash}</code>}{status.error && <details><summary>Structured error</summary><pre>{status.error}</pre></details>}</div> }
function arr(value: unknown, fallback: any[]): any[] { return Array.isArray(value) ? value : fallback }
function parseRuns(left: string, right: string) { try { const baseline = left.split(',').map((x) => Number(x.trim())); const candidate = right.split(',').map((x) => Number(x.trim())); if (baseline.length < 2 || baseline.length > 16 || candidate.length < 2 || candidate.length > 16 || baseline.some((x) => !Number.isInteger(x) || x < 0 || x > 1e12) || candidate.some((x) => !Number.isInteger(x) || x < 0 || x > 1e12) || baseline.reduce((a, b) => a + b, 0) === 0) return null; return { baseline, candidate } } catch { return null } }
function validateManifest(text: string, requirements: unknown) {
  const manifest = JSON.parse(text)
  if (!Array.isArray(manifest) || !manifest.length) throw new Error('Manifest must be a non-empty JSON array.')
  const expected = arr(requirements, []).map((item: any) => String(item.evidence_id))
  const seen = new Set<string>()
  for (const item of manifest) {
    if (!item || typeof item !== 'object' || typeof item.evidence_id !== 'string' || typeof item.url !== 'string' || typeof item.sha256 !== 'string') throw new Error('Each manifest item must contain evidence_id, url, and sha256.')
    if (seen.has(item.evidence_id)) throw new Error('Manifest contains a duplicate evidence ID.')
    seen.add(item.evidence_id)
    if (!expected.includes(item.evidence_id)) throw new Error('Unexpected evidence ID: ' + item.evidence_id)
    if (!/^https:\/\//i.test(item.url)) throw new Error('Evidence URLs must use HTTPS.')
    if (!/^[a-f0-9]{64}$/i.test(item.sha256)) throw new Error('Evidence SHA-256 values must be exactly 64 hexadecimal characters.')
  }
  for (const evidenceId of expected) if (!seen.has(evidenceId)) throw new Error('Missing required evidence ID: ' + evidenceId)
  return manifest
}
function truncZero(numerator: number, denominator: number) { return numerator >= 0 ? Math.floor(numerator / denominator) : -Math.floor(-numerator / denominator) }
function metricPreview(baseline: number[], candidate: number[], support: number, contradiction: number) { const bs = baseline.reduce((a, b) => a + b, 0); const cs = candidate.reduce((a, b) => a + b, 0); const metric = truncZero(((cs * baseline.length) - (bs * candidate.length)) * 10000, bs * candidate.length); return { metric, direction: metric >= support ? 'SUPPORTS' : metric <= contradiction ? 'CONTRADICTS' : 'INCONCLUSIVE' } }

export default App
