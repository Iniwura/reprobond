# ReproBond Reviewer Corrections

Status: deployed and live-audited on Studio Dev chain 61997.

Current corrected contract: 0x897a7dF67E638506557985FE795Ff2F762f01607
Source SHA-256: 5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b
Deployment transaction: 0x4e274c6d87bbe2b51b17c1c17df577b79960705c96e34920854c92502aecc9d4
Canonical live record: docs/STEWARD_AUDIT_20261007.md

## Corrections implemented

- Helpers use the pinned Studio Dev SDK deterministic transaction time from `gl.message.raw["datetime"]`. No host wall clock is used.
- Deadlines are accepted as exact UTC `YYYY-MM-DDTHH:MM:SSZ` strings and must be strictly future when a challenge is created.
- Funding, activation, and new replication submission are blocked at the frozen deadline. Already-submitted records remain adjudicable, repairable within the bound, and settleable after the deadline.
- Expiry requires OPEN, the sponsor, a reached deadline, an incomplete qualified count, and no SUBMITTED or repairable UNRESOLVED record. Terminal UNRESOLVED with exhausted repairs may be closed without being relabeled as FAIL.
- Partial challenges may become EXPIRED after pending work is resolved. Earned PASS rewards survive expiry; the sponsor can refund only unused escrow after all PASS records are PAID.
- The frontend handles the contract's required evidence flag, authoritative qualified slots, and exact non-millisecond UTC deadline serialization.

## Deterministic deadline rules

| Operation | Rule |
| --- | --- |
| create_challenge | deadline must be strictly future relative to the transaction time |
| fund_challenge / activate_challenge | not allowed at or after deadline |
| submit_replication | closes new participation at the deadline |
| adjudicate_replication / repair_unresolved / settle_replication | remain available for in-flight work after the deadline |

## Frontend validation

Runners and the app use the contract schema as the source of truth. Evidence manifests require evidence IDs marked required; optional IDs may be omitted or present. Slot capacity is authoritative `qualified_count`, not the total `replication_ids` length.

## Release gate

The corrected contract is deployed as a new address. The old address is
historical v1 only: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`. Live
deployment, transaction hashes, and scenario proof are recorded in
docs/STEWARD_AUDIT_20261007.md.
