# Corrected challenge preflight

Status: **SAFE TO CREATE NEW LIVE CHALLENGE**

This document records a non-production preflight. No replacement challenge was
created or funded, and no production ReproBond method was called during this
preflight.

## Invalid live fixture preserved

- Challenge: `live-contradiction-20260930-a`
- Production contract: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`
- Funding: `0x67f110383c4f11e121f077ce454c98389e83ac290f89f8b446eb37ddf9c9a237`
- Activation: `0xaff9be36a3ff8cbfb70b5002006440802936191598020376df05d00ed08fa666`
- Submission: `0xa7b89bd3c8fa6e252b270602e6760accb476ef13836cd5352fef9667fc3d34e4`
- First adjudication: `0x308922af6f4783da2f60778694dfda7cd145eeea17c4b52d0709bba6719b084f`
- Repair to revision 2: `0x06ac2763cc9936afda1fa12e6f3cfa5604813f97185dbfb3cb0287d33c36178e`
- Second adjudication: `0xa1678404514d0bdf888debbafa88ed624e03508f4f862937a69b507951e4c1fe`
- Current state at inspection: `OPEN`
- Remaining repairs: `1`
- Current escrow: `3000000000000` wei
- Qualified count: `0`
- Adjudicated count: `1`

## INVALID LIVE FIXTURE CONFIGURATION

The frozen `environment` criterion required:

> The public evidence artifact states the execution environment is Studio Dev
> chain 61997 with GenLayer JavaScript SDK 1.2.0 on Linux x86_64.

The actual live write/read path used `genlayer-js 2.0.0-rc.1`. This is a
configuration mismatch in the live fixture, not a failure of the ReproBond
protocol. The remaining repair was intentionally not consumed and no further
production adjudication was attempted.

## Legitimate old-escrow recovery path

The deployed-source-aligned contract has no deadline comparison in
`expire_challenge`; `deadline_utc` is stored immutable data only. The current
record is `OPEN`, has zero qualified replications, and the sponsor is
`0xa35dc047f9937bf668743efbdf8ea93b31a55888`.

Therefore the source-level recovery path is:

1. The sponsor calls `expire_challenge("live-contradiction-20260930-a")`.
2. After finalization in `EXPIRED`, the sponsor calls
   `refund_unused("live-contradiction-20260930-a")`.
3. With `paid_total == 0`, the computed refund is exactly `3000000000000` wei.

No expiry or refund call was made. Native transfer finalization remains a live
integration concern and is not claimed proven by this document.

## SDK criterion decision

`genlayer-js 2.0.0-rc.1` is the installed transaction/read tooling used to
submit and inspect the Studio audit. It is not part of the benchmark execution
environment and should not be a HARD fidelity requirement. The corrected
criterion records it as adjudication/transaction metadata while explicitly
stating that SDK version is not a benchmark-execution requirement.

Verified host metadata used by the corrected fixture:

- Studio Dev chain: `61997`
- OS/architecture: Linux x86_64 under WSL2
- installed transaction/read SDK: `genlayer-js 2.0.0-rc.1`

## Replacement challenge proposal

- Challenge ID: `reprobond-corrected-20261001-a`
- Claim: `Optimization X improves mean runtime by at least 20 percent for fixed-demo-workload-v1.`
- Slots: `3`
- Reward per qualified replication: `1000000000000` wei
- Required escrow: `3000000000000` wei
- Metric: `candidate_relative_change_bps.v1`
- Support threshold: `2000` bps
- Contradiction threshold: `-2000` bps
- Proposed deadline: `2026-10-31T00:00:00Z`

Exact proposed HARD criteria:

1. `environment`: The public evidence artifact states that the benchmark
   execution environment is Linux x86_64 with the same environment for the
   baseline and candidate, and records Studio Dev chain 61997 plus
   `genlayer-js 2.0.0-rc.1` as adjudication/transaction metadata. The SDK
   version is not a benchmark-execution requirement.
2. `trial_count`: Exactly five baseline and five candidate trials are submitted
   as raw integer arrays.
3. `analysis_method`: Use `candidate_relative_change_bps.v1` from the raw arrays
   and do not choose a result label manually.
4. `correctness_check`: The raw arrays are bounded and the evidence is fetched
   from the committed HTTPS URL.

The required evidence item is `methodology`, whose public artifact must identify
the benchmark environment, five-trial protocol, frozen analysis method, and
committed evidence binding.

## Immutable evidence preflight

Public repository commit:
`f6d0e4624e01768738d4edfc876894143ee85e08`

Methodology URL:
`https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md`

Environment URL:
`https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/environment.json`

Results URL:
`https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/results.json`

The contract's manifest would bind the methodology URL to the Studio-rendered
hash, not the raw transport-byte hash:

- raw local methodology bytes: `2090` bytes,
  SHA-256 `54af85766468e346123782b45710087c565e4bb0de0f5186b07765def576615a`
- Studio `gl.nondet.web.render(url, mode="text")` representation: `2082`
  UTF-8 characters/bytes,
  SHA-256 `c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac`
- environment raw SHA-256:
  `ea4c4ffb350fce835aa9c318b7b6d59c3a8d04b476dc752ce247a2224a62abe3`
- results raw SHA-256:
  `b3bfbed7c7010cba51564297fbe79787644e8cd34c0701baa1a39698d744db05`

All three commit-pinned URLs returned HTTP 200, non-empty bodies, and bytes
matching their local artifacts during preflight.

The existing deployed render probe was exercised with a non-mutating Studio
`sim_call` through installed `genlayer-js 2.0.0-rc.1`. It returned
`execution_result: SUCCESS`, rendered length `2082`, and the hash above. A
simulation has no transaction finality/consensus receipt; the semantic probe
below is the finalized Studio execution.

## Disposable semantic adjudication preflight

- Probe source: `/home/ini/reprobond/probes/semantic_adjudication_probe.py`
- Probe source SHA-256:
  `06b9a178af51ec32d0bff4f7a64b74c97d1863b2c43886e9382f0d200ad9376c`
- Probe contract: `0xa2F983c6B3703ab565A9D21eC8b53BB74e20FADa`
- Deployment transaction:
  `0x542f73a9b744fd66a63a3f0601f8d0983f8743a07f77f26f8d4ee122b7c38cec`
- Semantic probe transaction:
  `0x3d629f47b5f84dde8bc90dbea300cb82d844469d2b6161a9d723e8d5e7fa44ee`
- Probe receipt: `FINALIZED`, execution `FINISHED_WITH_RETURN`, consensus
  `MAJORITY_AGREE`

The probe used the exact proposed four criteria, exact methodology URL and
Studio-rendered hash, and the unchanged raw arrays:

- baseline: `[100,100,100,100,100]`
- candidate: `[75,75,75,75,75]`

Authoritative stored semantic result:

- environment: `SATISFIED`
- trial_count: `SATISFIED`
- analysis_method: `SATISFIED`
- correctness_check: `SATISFIED`
- fidelity: `PASS`
- deterministic metric: `-2500` bps
- deterministic result: `CONTRADICTS`

This preflight did not create, fund, activate, repair, adjudicate, or settle
any production ReproBond challenge.
