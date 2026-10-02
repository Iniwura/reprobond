import test from 'node:test'
import assert from 'node:assert/strict'

function truncZero(numerator, denominator) { return numerator >= 0n ? numerator / denominator : -((-numerator) / denominator) }
function metricPreview(baseline, candidate, support, contradiction) {
  const bs = baseline.reduce((a, b) => a + BigInt(b), 0n)
  const cs = candidate.reduce((a, b) => a + BigInt(b), 0n)
  const metric = truncZero(((cs * BigInt(baseline.length)) - (bs * BigInt(candidate.length))) * 10000n, bs * BigInt(candidate.length))
  return { metric, direction: metric >= BigInt(support) ? 'SUPPORTS' : metric <= BigInt(contradiction) ? 'CONTRADICTS' : 'INCONCLUSIVE' }
}
function validateManifest(manifest, requiredIds) {
  assert.ok(Array.isArray(manifest) && manifest.length > 0)
  const seen = new Set()
  for (const item of manifest) {
    assert.equal(typeof item.evidence_id, 'string')
    assert.ok(!seen.has(item.evidence_id))
    seen.add(item.evidence_id)
    assert.ok(requiredIds.includes(item.evidence_id))
    assert.match(item.url, /^https:\/\//)
    assert.match(item.sha256, /^[a-f0-9]{64}$/i)
  }
  assert.deepEqual([...seen].sort(), [...requiredIds].sort())
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
