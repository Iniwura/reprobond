# ReproBond Deployment Candidate Audit

## Frozen source

- Source: `contracts/repro_bond.py`
- SHA-256: `0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc`
- Git status/diff: unavailable because `/home/ini/reprobond` is not a Git repository.
- Contract source was not changed after this hash was recorded.

## Local gates

- Direct Mode: 88 passed.
- Lint and validation: passed; 15 methods, 6 views, 9 writes.
- Typecheck: passed.

## Exact generated schema

```text
Contract: ReproBond

Constructor (0 params):

Methods (15):
  - activate_challenge(challenge_id) [write]
  - adjudicate_replication(challenge_id, replication_id) [write]
  - create_challenge(challenge_id, claim, protocol_criteria, evidence_requirements, metric_definition, support_threshold_bps, contradiction_threshold_bps, required_slot_count, reward_per_replication, deadline_utc) [write]
  - expire_challenge(challenge_id) [write]
  - fund_challenge(challenge_id) [write]
  - get_aggregate_result(challenge_id) [view]
  - get_challenge(challenge_id) [view]
  - get_challenge_fingerprint(challenge_id) [view]
  - get_challenge_replication_ids(challenge_id) [view]
  - get_replication(challenge_id, replication_id) [view]
  - get_replication_history(challenge_id, replication_id) [view]
  - refund_unused(challenge_id) [write]
  - repair_unresolved(challenge_id, replication_id, manifest, baseline_runs, candidate_runs) [write]
  - settle_replication(challenge_id, replication_id) [write]
  - submit_replication(challenge_id, manifest, baseline_runs, candidate_runs) [write]
```
