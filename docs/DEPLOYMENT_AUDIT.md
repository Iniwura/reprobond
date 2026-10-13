# ReproBond Deployment Candidate Audit

## Candidate source

- Source: contracts/repro_bond.py
- Candidate SHA-256: 42b14953983c492c22b98eaede74154932bc49809ef11ce0d795a750575c2bfd
- Network target: Studio Dev, chain 61997
- Installed CLI: GenLayer 0.40.0-rc.3
- Installed lint/runtime gates: genvm-lint 0.11.0, Python 3.12.3, pinned Direct Mode environment in /home/ini/materialproof/.venv.
- Previous pre-fix candidate status: deployed to Studio Dev after explicit deployment approval; the corrected source below requires a fresh deployment.
- Previous candidate deployment (pre-FUNDED-recovery fix): 0x33735bbaa9595FBB1b8a9fFCC3A91103911baEdC
- Deployment transaction: 0x96fc388280e501c1790b5844f76ebc4a7fb8e032d22a907ef52eb2e19978530e
- Deployment result: FINALIZED / ACCEPTED / FINISHED_WITH_RETURN / MAJORITY_AGREE
- Historical corrected contract: 0x897a7dF67E638506557985FE795Ff2F762f01607
- Historical deployment transaction: 0x4e274c6d87bbe2b51b17c1c17df577b79960705c96e34920854c92502aecc9d4
- Canonical live challenge: none on this deployment yet
- Canonical replication: none on this deployment yet
- Live audit: docs/STEWARD_AUDIT_20261007.md

The historical v1 contract at 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc remains unchanged. Neither historical deployment includes the steward-fix candidate in this document.

The candidate adds a fixed 86,400-second transaction-time recovery grace,
explicit ABANDONED closure status, and protected PASS-reserve accounting.

The previous deployment source hash is
`ea1b0bcde33e67f3a09c7c934e8471fcba09bda711f65d000d5a8760c21db9a3`.
The new local candidate hash is
`2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82` and is
not deployed yet. The previous deployment's constructor is zero-argument and
its authoritative schema contains the exact 15-method candidate schema.
The previous deployment was created independently of the historical challenge records.
It contains the earlier `ea1b0bc...` candidate and is not the deployment target
for this new source revision.
Authoritative view calls are currently blocked by a Studio Dev RPC error before
contract execution; no new challenge is being created or funded while that
condition persists.

## Local gates — current candidate

Rerun on 2026-10-13 against source SHA
`2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82`:

- Direct Mode: **117 passed**.
- Python syntax: **passed**.
- GenVM lint: **passed**, 3 checks.
- GenVM validation: **passed**, 15 methods (6 views, 9 writes), using the
  installed `genvm-linter 0.11.1rc2` with the verified Studio Dev runner.
- GenVM schema extraction: **passed**, exact 15-method schema.
- GenVM typecheck: **passed**, no type errors.
- Frontend protocol tests: **20 passed**.
- Frontend TypeScript and production build: **passed**.

The previous deployment's source and schema were separately verified with the
Studio Dev CLI. Direct Mode and frontend results are local candidate checks;
the new source requires a fresh deployment and live proof. The current read/fee boundary is:
`gen_call` and `sim_estimateTransactionFees` return Studio Dev error
`Can't reconnect until invalid transaction is rolled back. Please rollback() fully before proceeding`.

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
