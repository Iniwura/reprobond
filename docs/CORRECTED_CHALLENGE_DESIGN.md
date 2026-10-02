# Corrected live challenge design

This is a preflight design only. No challenge has been created or funded.

## Identity and economics

- Challenge ID: reprobond-corrected-20261001-a
- Network: Studio Dev, chain 61997
- Claim: Optimization X improves mean runtime by at least 20 percent for
  fixed-demo-workload-v1.
- Required slots: 3
- Reward per qualified replication: 1000000000000 wei
- Required escrow: 3000000000000 wei
- Metric: candidate_relative_change_bps.v1
- Support threshold: 2000 bps
- Contradiction threshold: -2000 bps
- Proposed deadline: 2026-10-31T00:00:00Z

The SDK version is not a benchmark-execution criterion. The installed
genlayer-js 2.0.0-rc.1 is the transaction/read path used to submit and inspect
the Studio audit. It is recorded as metadata so the audit is reproducible, but
it is not used to decide whether the benchmark itself was faithful.

## Exact frozen criteria

Each entry uses the production schema
{criterion_id, requirement, semantics} and has HARD semantics.

1. environment: The public evidence artifact states that the benchmark
   execution environment is Linux x86_64 with the same environment for the
   baseline and candidate, and records Studio Dev chain 61997 plus
   genlayer-js 2.0.0-rc.1 as adjudication/transaction metadata. The SDK
   version is not a benchmark-execution requirement.
2. trial_count: Exactly five baseline and five candidate trials are submitted
   as raw integer arrays.
3. analysis_method: Use candidate_relative_change_bps.v1 from the raw arrays and
   do not choose a result label manually.
4. correctness_check: The raw arrays are bounded and the evidence is fetched
   from the committed HTTPS URL.

## Evidence requirement

- evidence_id: methodology
- required: true
- requirement: The public HTTPS artifact identifies the benchmark environment,
  the five-trial protocol, the frozen analysis method, and the committed
  evidence binding for this replication.

## Canonical numeric packet

- baseline: [100,100,100,100,100]
- candidate: [75,75,75,75,75]
- derived metric: -2500 bps
- expected deterministic direction: CONTRADICTS

The direction is expected from the contract arithmetic, not entered in any
evidence artifact or adjudication argument. PASS/FAIL/UNRESOLVED fidelity is
still derived only by the GenLayer semantic adjudication boundary.
