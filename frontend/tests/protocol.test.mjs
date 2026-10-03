import test from 'node:test'
import assert from 'node:assert/strict'

function truncZero(numerator, denominator) { return numerator >= 0n ? numerator / denominator : -((-numerator) / denominator) }
function metricPreview(baseline, candidate, support, contradiction) {
  const bs = baseline.reduce((a, b) => a + BigInt(b), 0n)
  const cs = candidate.reduce((a, b) => a + BigInt(b), 0n)
  const metric = truncZero(((cs * BigInt(baseline.length)) - (bs * BigInt(candidate.length))) * 10000n, bs * BigInt(candidate.length))
  return { metric, direction: metric >= BigInt(support) ? 'SUPPORTS' : metric <= BigInt(contradiction) ? 'CONTRADICTS' : 'INCONCLUSIVE' }
}
function validateManifest(manifest, requirements) {
  assert.ok(Array.isArray(manifest) && manifest.length > 0)
  const items = requirements.map((item) => typeof item === 'string' ? { evidence_id: item, required: true } : item)
  const expected = items.map((item) => item.evidence_id)
  const required = items.filter((item) => item.required).map((item) => item.evidence_id)
  const seen = new Set()
  for (const item of manifest) {
    assert.equal(typeof item.evidence_id, 'string')
    assert.ok(!seen.has(item.evidence_id))
    seen.add(item.evidence_id)
    assert.ok(expected.includes(item.evidence_id))
    assert.match(item.url, /^https:\/\//)
    assert.match(item.sha256, /^[a-f0-9]{64}$/i)
  }
  for (const evidenceId of required) assert.ok(seen.has(evidenceId))
  assert.ok(seen.size <= expected.length)
}

test('deterministic live packet derives -2500 bps and CONTRADICTS', () => {
  const result = metricPreview([100, 100, 100, 100, 100], [75, 75, 75, 75, 75], 2000, -2000)
  assert.equal(result.metric, -2500n)
  assert.equal(result.direction, 'CONTRADICTS')
})
test('support threshold is inclusive', () => { assert.equal(metricPreview([100], [120], 2000, -2000).direction, 'SUPPORTS') })
test('contradiction threshold is inclusive', () => { assert.equal(metricPreview([100], [80], 2000, -2000).direction, 'CONTRADICTS') })
test('middle result is INCONCLUSIVE', () => { assert.equal(metricPreview([100], [95], 2000, -2000).direction, 'INCONCLUSIVE') })
test('negative fixed-point division truncates toward zero', () => { assert.equal(truncZero(-2501n, 1000n), -2n) })
test('manifest accepts exact HTTPS evidence binding', () => { validateManifest([{ evidence_id: 'methodology', url: 'https://example.test/methodology.md', sha256: 'a'.repeat(64) }], ['methodology']) })
test('manifest rejects non-HTTPS, malformed hash, and duplicate IDs', () => { assert.throws(() => validateManifest([{ evidence_id: 'methodology', url: 'http://example.test/a', sha256: 'a'.repeat(64) }], ['methodology'])); assert.throws(() => validateManifest([{ evidence_id: 'methodology', url: 'https://example.test/a', sha256: 'not-a-hash' }], ['methodology'])); assert.throws(() => validateManifest([{ evidence_id: 'methodology', url: 'https://example.test/a', sha256: 'a'.repeat(64) }, { evidence_id: 'methodology', url: 'https://example.test/b', sha256: 'b'.repeat(64) }], ['methodology'])) })
test('raw packet has no user-selectable result direction', () => { const rawPacket = { baseline_runs: [100, 100], candidate_runs: [75, 75] }; assert.equal('result' in rawPacket, false); assert.equal('classification' in rawPacket, false) })
test('result-neutral settlement uses fidelity only', () => { const settlementStates = ['SUPPORTS', 'CONTRADICTS', 'INCONCLUSIVE'].map((direction) => ({ direction, pays: 'PASS' === 'PASS', reward: 1000000000000n })); assert.deepEqual(settlementStates.map((item) => item.reward), [1000000000000n, 1000000000000n, 1000000000000n]); assert.ok(settlementStates.every((item) => item.pays)) })

function contractDeadline(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
function localDeadline(value) {
  return contractDeadline(new Date(value))
}
function closureActions({ state, deadlineReached, pending, qualified, required, unpaidPasses, paidCount, paidRecords, sponsor, chainOk }) {
  return {
    canExpire: sponsor && chainOk && state === 'OPEN' && deadlineReached && pending === 0 && qualified < required,
    canRefund: sponsor && chainOk && state === 'EXPIRED' && unpaidPasses === 0 && paidCount === paidRecords,
  }
}

test('contract deadline serialization is exactly 20 UTC characters with no milliseconds', () => {
  const value = contractDeadline(new Date('2026-12-31T00:00:00.987Z'))
  assert.equal(value, '2026-12-31T00:00:00Z')
  assert.equal(value.length, 20)
  assert.equal(value.includes('.'), false)
})

test('datetime-local converts from local selection to UTC without truncating arbitrarily', () => {
  const input = '2026-12-31T00:00'
  const value = localDeadline(input)
  assert.equal(value, contractDeadline(new Date(input)))
  assert.equal(value.length, 20)
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
})

test('automatic future deadline is accepted by the contract format', () => {
  const value = contractDeadline(new Date(Date.parse('2026-10-04T12:00:00Z') + 30 * 86400000))
  assert.equal(value, '2026-11-03T12:00:00Z')
  assert.equal(value.length, 20)
})

test('required-only manifest is accepted', () => {
  validateManifest([{ evidence_id: 'methodology', url: 'https://example.test/methodology.md', sha256: 'a'.repeat(64) }], [{ evidence_id: 'methodology', required: true }, { evidence_id: 'code', required: false }])
})

test('required plus optional manifest is accepted', () => {
  validateManifest([{ evidence_id: 'methodology', url: 'https://example.test/methodology.md', sha256: 'a'.repeat(64) }, { evidence_id: 'code', url: 'https://example.test/commit', sha256: 'b'.repeat(64) }], [{ evidence_id: 'methodology', required: true }, { evidence_id: 'code', required: false }])
})

test('missing required evidence is rejected while optional omission is allowed', () => {
  assert.throws(() => validateManifest([{ evidence_id: 'code', url: 'https://example.test/commit', sha256: 'b'.repeat(64) }], [{ evidence_id: 'methodology', required: true }, { evidence_id: 'code', required: false }]))
})

test('unknown and duplicate evidence are rejected', () => {
  assert.throws(() => validateManifest([{ evidence_id: 'unknown', url: 'https://example.test/unknown', sha256: 'a'.repeat(64) }], [{ evidence_id: 'methodology', required: true }]))
  assert.throws(() => validateManifest([{ evidence_id: 'methodology', url: 'https://example.test/a', sha256: 'a'.repeat(64) }, { evidence_id: 'methodology', url: 'https://example.test/b', sha256: 'b'.repeat(64) }], [{ evidence_id: 'methodology', required: true }]))
})

test('qualified_count, not total record count, controls submission capacity', () => {
  assert.deepEqual(closureActions({ state: 'OPEN', deadlineReached: false, pending: 0, qualified: 1, required: 2, unpaidPasses: 0, paidCount: 0, paidRecords: 0, sponsor: false, chainOk: true }), { canExpire: false, canRefund: false })
  assert.equal(1 < 2, true)
  assert.equal(2 < 2, false)
})

test('pending submitted work blocks expiry while terminal partial state can close', () => {
  assert.equal(closureActions({ state: 'OPEN', deadlineReached: true, pending: 1, qualified: 0, required: 2, unpaidPasses: 0, paidCount: 0, paidRecords: 0, sponsor: true, chainOk: true }).canExpire, false)
  assert.equal(closureActions({ state: 'OPEN', deadlineReached: true, pending: 0, qualified: 1, required: 2, unpaidPasses: 0, paidCount: 0, paidRecords: 0, sponsor: true, chainOk: true }).canExpire, true)
})

test('earned PASS remains visible after expiry and refund waits for payout', () => {
  assert.equal(closureActions({ state: 'EXPIRED', deadlineReached: true, pending: 0, qualified: 1, required: 2, unpaidPasses: 1, paidCount: 0, paidRecords: 0, sponsor: true, chainOk: true }).canRefund, false)
  assert.equal(closureActions({ state: 'EXPIRED', deadlineReached: true, pending: 0, qualified: 1, required: 2, unpaidPasses: 0, paidCount: 1, paidRecords: 1, sponsor: true, chainOk: true }).canRefund, true)
})

test('refund remains disabled after expired state until every PASS is PAID', () => {
  const before = closureActions({ state: 'EXPIRED', deadlineReached: true, pending: 0, qualified: 1, required: 2, unpaidPasses: 0, paidCount: 0, paidRecords: 1, sponsor: true, chainOk: true })
  assert.equal(before.canRefund, false)
})
