# ReproBond Deployment Candidate Audit

## Candidate source

- Source: contracts/repro_bond.py
- Candidate SHA-256: 5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b
- Network target: Studio Dev, chain 61997
- Installed CLI: GenLayer 0.40.0-rc.3
- Installed lint/runtime gates: genvm-lint 0.11.0, Python 3.12.3, pinned Direct Mode environment in /home/ini/materialproof/.venv.
- Deployment status: deployed and live-audited on Studio Dev.
- Corrected contract: 0x897a7dF67E638506557985FE795Ff2F762f01607
- Deployment transaction: 0x4e274c6d87bbe2b51b17c1c17df577b79960705c96e34920854c92502aecc9d4
- Canonical live challenge: reprobond-steward-consolidated-20261007-b
- Canonical replication: e7de30481ab0395935d39da02f39be5f748a24fb8fb4a329470d4dc51ceca11e
- Live audit: docs/STEWARD_AUDIT_20261007.md

The historical v1 contract at 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc remains unchanged and is not the corrected deployment.

## Local gates

- Direct Mode: 109 passed.
- Python syntax: passed.
- genvm-lint check: passed, 3 checks.
- genvm-lint validate: passed; 15 methods, 6 views, 9 writes.
- genvm-lint schema: passed; exact 15-method schema extracted.
- genvm-lint typecheck: passed with no type errors.
- Frontend protocol tests: 20 passed.
- Frontend TypeScript and production build: passed.

## Exact generated schema

Contract: ReproBond
Constructor: 0 params
Methods: 15 total (6 view, 9 write)

Writes:
- activate_challenge(challenge_id)
- adjudicate_replication(challenge_id, replication_id)
- create_challenge(challenge_id, claim, protocol_criteria, evidence_requirements, metric_definition, support_threshold_bps, contradiction_threshold_bps, required_slot_count, reward_per_replication, deadline_utc)
- expire_challenge(challenge_id)
- fund_challenge(challenge_id), payable
- repair_unresolved(challenge_id, replication_id, manifest, baseline_runs, candidate_runs)
- settle_replication(challenge_id, replication_id)
- submit_replication(challenge_id, manifest, baseline_runs, candidate_runs)

Views:
- get_aggregate_result(challenge_id)
- get_challenge(challenge_id)
- get_challenge_fingerprint(challenge_id)
- get_challenge_replication_ids(challenge_id)
- get_replication(challenge_id, replication_id)
- get_replication_history(challenge_id, replication_id)

The full machine-readable schema is generated from the candidate with genvm-lint schema --json at deployment time.
