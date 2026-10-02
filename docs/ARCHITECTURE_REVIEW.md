# ReproBond Architecture Review

## Chosen architecture

ReproBond is a single escrow contract with immutable challenge definitions, bounded replication records, revision-preserving evidence manifests, a single GenLayer semantic adjudication boundary, deterministic integer arithmetic, and native GEN settlement.

The contract deliberately does not attempt universal scientific verification. V1 supports a single quantitative domain: paired baseline/candidate run arrays and the fixed candidate_relative_change_bps.v1 metric.

## Why this is the smallest safe shape

- One challenge record owns all immutable economic and semantic parameters.
- One replication record owns the current revision and a bounded history.
- One address index prevents repeat qualified identities.
- One adjudication function is the only path from SUBMITTED to a fidelity result.
- One native-transfer helper is used for rewards and refunds.
- Numeric result direction is calculated after, and independently from, fidelity.
- Aggregation counts only PASS records and never changes individual reward amounts.

## Review decisions

### Reservation

No slot reservation is needed. A slot is consumed only by a successful PASS qualification. FAIL and UNRESOLVED attempts do not consume a qualified slot. This maximizes usable capacity but permits bounded failed attempts; the contract limits total distinct records.

### Semantic result

The leader and validator independently fetch the same frozen manifest and run the same bounded prompt. They compare exact criterion IDs and statuses, not free-form reasoning. Fetch/hash failures force all criteria to UNRESOLVED.

### Numeric result

For baseline sum B, candidate sum C, baseline count nB, candidate count nC, the contract computes:

relative_change_bps = trunc_zero(((C*nB - B*nC) * 10000) / (B*nC)).

A value at or above the support threshold is SUPPORTS. A value at or below the contradiction threshold is CONTRADICTS. Otherwise it is INCONCLUSIVE. No floating point or model arithmetic is used.

### Settlement law

PASS + SUPPORTS -> exact reward
PASS + CONTRADICTS -> exact reward
PASS + INCONCLUSIVE -> exact reward
FAIL -> no payout
UNRESOLVED -> no payout yet

The implementation has no branch that selects the amount based on direction.

### Known integration gate

The production contract uses the current @gl.evm.contract_interface / emit_transfer(value=amount) mechanism, defaulting to finalization. A deployed live transaction must still prove recipient balance increase and contract balance decrease. The failed Phase 0 probe does not justify replacing this with internal credits.
