# ReproBond final-slots terminal-fail fixture

challenge_id: reprobond-steward-final-slots-20261008-a
fixture_role: deliberate terminal FAIL repair artifact

## Environment

benchmark_environment: Windows x86_64
baseline_environment: Windows x86_64
candidate_environment: Windows x86_64
same_environment: true
workload: fixed-demo-workload-v1
measurement_unit: integer milliseconds

This artifact deliberately does not satisfy the frozen environment criterion,
which requires Linux x86_64. The benchmark observations described here were
not executed on Linux x86_64.

## Trial protocol

baseline_trial_count: 5
candidate_trial_count: 5
discarded_runs: 0
same_workload_input: true

The replication raw packet remains exactly five baseline integer runs and five
candidate integer runs. The values are stored in the contract submission, not
selected by this document.

## Analysis method

metric: candidate_relative_change_bps.v1
result_label_selected_manually: false

The contract must derive the metric and result direction from the submitted
raw arrays and frozen thresholds. This document does not choose SUPPORTS,
CONTRADICTS, or INCONCLUSIVE.

## Correctness and evidence binding

raw_arrays_bounded: true
evidence_binding: this file is the immutable HTTPS artifact named by the
repair manifest and committed at a pinned Git revision
adjudication_network: Studio Dev
adjudication_chain_id: 61997
transaction_submission_sdk: genlayer-js 2.0.0-rc.1

The SDK metadata describes transaction plumbing only. The deliberate failure
is the benchmark environment mismatch above.
