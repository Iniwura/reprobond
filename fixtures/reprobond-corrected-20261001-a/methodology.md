# ReproBond corrected live fixture methodology

This public artifact is the immutable methodology evidence for challenge
reprobond-corrected-20261001-a.

## Claim and bounded benchmark

The preregistered computational claim is that Optimization X improves mean
runtime by at least 20 percent for the fixed demo workload
fixed-demo-workload-v1.

- Baseline implementation: fixed-demo-baseline-v1
- Candidate implementation: fixed-demo-candidate-v1
- Workload/input: fixed-demo-workload-v1
- Measurement unit: integer milliseconds
- Benchmark execution environment: Linux x86_64
- The baseline and candidate use the same environment and the same workload/input.
- No observed run is discarded.

## Trial protocol

The replication submits exactly five baseline trials and exactly five candidate
trials as bounded raw integer arrays. The submitted raw packet is stored by the
contract; this methodology artifact does not select or label the result
direction.

## Analysis method

The contract applies the frozen candidate_relative_change_bps.v1 method to
the submitted raw arrays. It uses integer arithmetic and truncation toward
zero. The result direction is derived by the contract from that metric and the
immutable challenge thresholds. No result label is chosen manually.

## Adjudication and evidence metadata

- Adjudication network: Studio Dev
- Adjudication chain ID: 61997
- Transaction submission SDK: genlayer-js 2.0.0-rc.1
- SDK role: transaction submission and read plumbing only; SDK version is not a
  benchmark-execution fidelity requirement.
- Evidence binding: this file is the public HTTPS methodology artifact named
  by the replication manifest and committed at an immutable Git revision.
- Raw packet artifact: the companion results.json file contains the bounded
  arrays submitted to the contract.
- Environment metadata artifact: the companion environment.json file records
  the execution and adjudication metadata above.

The evidence is a bounded reproducibility fixture for a computational benchmark
domain. It is not a claim of universal scientific verification.
