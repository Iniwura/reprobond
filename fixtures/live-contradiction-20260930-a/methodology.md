# ReproBond live replication methodology

This is the bounded public evidence fixture for challenge
`live-contradiction-20260930-a`.

## Objective

The preregistered benchmark claim is that Optimization X improves mean runtime
by at least 20%. The baseline implementation is the fixed-demo baseline for
workload `fixed-demo-workload-v1`. The candidate implementation is the
fixed-demo candidate for the same workload.

## Replication protocol

- Run exactly five baseline trials and exactly five candidate trials.
- Use the same workload/input and the same execution environment for both
  implementations.
- Preserve every observed run; no runs are discarded.
- Record raw measurements in integer milliseconds.
- Submit the raw arrays exactly as recorded in the companion `results.json`
  artifact.
- The companion `environment.json` artifact records the deterministic fixture
  environment and trial-count constraints.

## Frozen analysis

The raw arrays are evaluated by the challenge's frozen
`candidate_relative_change_bps.v1` method. It computes the candidate-versus-
baseline relative change in basis points from the two submitted arrays using
integer arithmetic and truncation toward zero. The replication does not submit
a manually selected result direction; the contract derives that value from the
raw arrays.

This fixture is intentionally narrow and reproducible. It is a public demo
evidence packet for the bounded ReproBond computational domain, not a claim of
universal scientific verification.
