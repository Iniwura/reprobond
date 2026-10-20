# ReproBond Deployment Candidate Audit

## Deployed production contract

- Source: `contracts/repro_bond.py`
- Contract SHA-256: `2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82`
- Network target: Studio Dev, chain 61997
- Deployed address: `0xBe987E257a07dF2EC17FFcF92764674C5F9b8077`
- Deployment transaction: `0xe4b50cfafb355d2802a4dd5cdd38be1123bbe4a9d167119def7f1dac82b438f5`
- Deployment status: FINALIZED / ACCEPTED / SUCCESSFUL / 15-method schema verified
- Deployer / Sponsor: `0xcE5348Ced92f54aE2407b41E754465DfC2E6cA78`
- Receipt artifact: `frontend/scripts/deployment-candidate-receipt.json`

## Historical deployments (for provenance only)

- Historical corrected contract (v2): `0x897a7dF67E638506557985FE795Ff2F762f01607`
  - Deployment transaction: `0x4e274c6d87bbe2b51b17c1c17df577b79960705c96e34920854c92502aecc9d4`
  - Historical audit: `docs/STEWARD_AUDIT_20261007.md`
- Historical v1 contract: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`

---

## Live On-Chain Defect Verifications

### 1. Defect 2 Live Proof: Unclaimed PASS Escrow Recovery
- **Challenge ID**: `reprobond-live-pass-mvgv43ca`
- **Replication ID**: `1e511bfa4bc5c480c9d3b47b24372b9f6d96c57c08fc1dde290814112bad3c49`
- **Setup**: 2 slots requested, funded with exact 2 wei escrow (`0.000000000000000002 GEN`). Replicator A submitted valid replication.
- **Adjudication**: Consensus returned `PASS` (-2500 bps, `CONTRADICTS`).
- **Expiry**: Challenge reached deadline with 1 qualified PASS and 1 unfulfilled slot; transitioned to `EXPIRED` (`refundable_unused`: 1 wei, `outstanding_pass_reserve`: 1 wei).
- **Refund Unused**: Sponsor called `refund_unused` while PASS reward was unclaimed. Contract transitioned to `REFUNDED`, returned 1 wei unused escrow to sponsor, and safely retained 1 wei in `outstanding_pass_reserve`.
- **Settlement after Refund**: Replicator A called `settle_replication` on the `REFUNDED` challenge and was successfully paid 1 wei from the protected reserve. Remaining pool: 0.

| Step | Operation | Transaction Hash | Status |
| --- | --- | --- | --- |
| 1 | `create_challenge` | `0x024332444ff152123b4ff9236323db05b4148a1c6a511830721a63e9d7202b93` | Finalized / Success |
| 2 | `fund_challenge` (2 wei) | `0x3278e31f5842eebf9b19b48bf1d848fb636e2dbe3e6ea929f6f856d4bf0c647c` | Finalized / Success |
| 3 | `activate_challenge` | `0xfc5363d4993ce263b31da440db8041261de3bfa9ba75f9a9e5f943bba4ed469b` | Finalized / Success |
| 4 | `submit_replication` (A) | `0x8c80ec2514307120dc16024468db7ef3987f87a0188a5625a2ddccd483a4b802` | Finalized / Success |
| 5 | `adjudicate_replication` (A) | `0xb698cd9906c69007f18881fdd5f878679d6598d3267c2da6c24873c566526a68` | Finalized / Success (PASS) |
| 6 | `expire_challenge` | `0x207ca663794f13f8ac68fad42903a8a8f11627c616d2660ebd7f55fad8b1489c` | Finalized / Success (EXPIRED) |
| 7 | `refund_unused` | `0xc0c32e20b9c4509a28e0e367802ea1e82a506e837d1e8038abe377a70a8c9a0c` | Finalized / Success (REFUNDED) |
| 8 | `settle_replication` (A) | `0x7a704761a62efdf0bfc2189273d92adde96edec59f9ce88e89d882243bd3af72` | Finalized / Success (PAID) |

---

### 2. Defect 1 Live Proof: Repairable UNRESOLVED Recovery Grace Protection
- **Challenge ID**: `reprobond-live-unres-mvgwqouz`
- **Replication ID**: `2820f39e1c1cf81b024d88c07e19c378258e35f80b91649d26c043839f72eda7`
- **Setup**: 1 slot requested, funded with 1 wei escrow. Replicator B submitted with deliberately invalid evidence hash.
- **Adjudication**: Adjudicated to `UNRESOLVED` (repairable, revision 0 $\le$ `MAX_REPAIRS=1`).
- **Grace Protection**: Deadline passed at `2026-10-20T16:45:28Z`. Recovery deadline set deterministically to `2026-10-21T16:45:28Z` (`deadline_utc + 86400s`).
- **Expiry Attempt Rejection**: Sponsor attempted to call `expire_challenge` after the deadline during the recovery grace window.
- **Result**: Consensus rejected the transaction on-chain (`FINISHED_WITH_ERROR`), reverting with `repairable UNRESOLVED replication blocks expiry during the recovery grace period.`. The challenge remains protected in state `OPEN`.
- **Bounded Non-Permanent Closure**: Once `recovery_deadline_utc` is reached, `expire_challenge` transitions the un-repaired record to `ABANDONED` and expires the challenge, preventing any permanent fund lock.

| Step | Operation | Transaction Hash | Status |
| --- | --- | --- | --- |
| 1 | `create_challenge` | `0x9cfa6c56cfc1d1a50e5bb295d93dbbe1b806520a7a07128bb81bbba4d62dd07c` | Finalized / Success |
| 2 | `fund_challenge` (1 wei) | `0x965d3b181161749baf12892f194858a8ffd424756d9bde18d1e8d92be4f2b183` | Finalized / Success |
| 3 | `activate_challenge` | `0x9c190a2c9abe17c444b31cd4a682dca466ce1f70c268534cd0d8c0bdc1103212` | Finalized / Success |
| 4 | `submit_replication` (B) | `0x2ff4a28654e3a7db9de16a233d215545b44718a2f6a5e34e5c6fc5ea619aca4d` | Finalized / Success |
| 5 | `adjudicate_replication` (B) | `0x93e0b493722b1bdeb9fcb872fbc4570e80e95295eddded4620c2b2192271c0cc` | Finalized / Success (UNRESOLVED) |
| 6 | `expire_challenge` (attempt during grace) | `0x1633015850c703a5e54e20a511e695e69ebfbb9b625ac6332e96c1e3d4e6022a` | Finalized / Reverted (Expected Grace Rejection) |

---

## Local Verification Gates

- Direct Mode: **117 passed**.
- Python syntax: **passed**.
- GenVM lint: **passed**, 3 checks.
- GenVM validation: **passed**, 15 methods (6 views, 9 writes).
- GenVM schema extraction: **passed**, exact 15-method schema.
- GenVM typecheck: **passed**, no type errors.
- Frontend protocol tests: **20 passed**.
- Frontend TypeScript and production build: **passed**.

## Authoritative Generated Schema

Contract: `ReproBond`  
Constructor: 0 params  
Methods: 15 total (6 views, 9 writes)

Writes:
- `activate_challenge(challenge_id)`
- `adjudicate_replication(challenge_id, replication_id)`
- `create_challenge(challenge_id, claim, protocol_criteria, evidence_requirements, metric_definition, support_threshold_bps, contradiction_threshold_bps, required_slot_count, reward_per_replication, deadline_utc)`
- `expire_challenge(challenge_id)`
- `fund_challenge(challenge_id)` (payable)
- `refund_unused(challenge_id)`
- `repair_unresolved(challenge_id, replication_id, manifest, baseline_runs, candidate_runs)`
- `settle_replication(challenge_id, replication_id)`
- `submit_replication(challenge_id, manifest, baseline_runs, candidate_runs)`

Views:
- `get_aggregate_result(challenge_id)`
- `get_challenge(challenge_id)`
- `get_challenge_fingerprint(challenge_id)`
- `get_challenge_replication_ids(challenge_id)`
- `get_replication(challenge_id, replication_id)`
- `get_replication_history(challenge_id, replication_id)`
