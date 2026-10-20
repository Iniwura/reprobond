# ReproBond Reviewer Corrections

Status: Deployed to Studio Devnet (Chain 61997) & Proven Live.

Deployed production contract: `0xBe987E257a07dF2EC17FFcF92764674C5F9b8077`  
Deployment transaction: `0xe4b50cfafb355d2802a4dd5cdd38be1123bbe4a9d167119def7f1dac82b438f5`  
Production source SHA-256: `2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82`  
Historical corrected contract (v2): `0x897a7dF67E638506557985FE795Ff2F762f01607`  
Historical v1 contract: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`  
Live audit record: `docs/DEPLOYMENT_AUDIT.md` (and `frontend/scripts/live-proof-audit-record.json`)

## Corrections implemented

- Helpers use the pinned Studio Dev SDK deterministic transaction time from `gl.message.raw["datetime"]`. No host wall clock is used.
- Deadlines are accepted as exact UTC `YYYY-MM-DDTHH:MM:SSZ` strings and must be strictly future when a challenge is created.
- Funding, activation, and new replication submission are blocked at the frozen deadline. Already-submitted records remain adjudicable, repairable within the bound, and settleable after the deadline.
- Expiry requires an incomplete OPEN or FUNDED challenge, the sponsor, and a reached deadline. An expired FUNDED challenge has no replication records and can transition directly to EXPIRED, making its full escrow recoverable through the existing refund path. SUBMITTED and repairable UNRESOLVED records block OPEN expiry during the deterministic 24-hour recovery grace; after grace they become explicit ABANDONED records, never FAIL.
- Partial challenges may become EXPIRED after pending work is resolved or abandoned after grace. Earned PASS rewards survive expiry; the sponsor may recover only unearned slot escrow while PASS reserves remain payable.
- An unpaid PASS remains settleable after the challenge becomes REFUNDED; settlement subtracts prior `refunded_total` and can only be called by the stored replicator.
- The frontend handles the contract's required evidence flag, authoritative qualified slots, and exact non-millisecond UTC deadline serialization.

## Deterministic deadline rules

| Operation | Rule |
| --- | --- |
| create_challenge | deadline must be strictly future relative to the transaction time |
| fund_challenge / activate_challenge | not allowed at or after deadline |
| submit_replication | closes new participation at the deadline |
| expire_challenge | sponsor may close expired FUNDED challenges with no records, or incomplete OPEN challenges under the recovery rules |
| adjudicate_replication / repair_unresolved / settle_replication | adjudication and bounded repair remain available during the recovery window; settlement remains available through EXPIRED and REFUNDED for existing PASS records |

## Frontend validation

Runners and the app use the contract schema as the source of truth. Evidence manifests require evidence IDs marked required; optional IDs may be omitted or present. Slot capacity is authoritative `qualified_count`, not the total `replication_ids` length.

## Live On-Chain Proofs

Both steward-identified defects have been verified with live transactions on GenLayer Studio Dev (Chain ID: 61997):

### Defect 2: Unclaimed PASS does not block recovery of unrelated unused escrow
- **Challenge ID**: `reprobond-live-pass-mvgv43ca`
- **Create**: `0x024332444ff152123b4ff9236323db05b4148a1c6a511830721a63e9d7202b93`
- **Fund** (2 wei): `0x3278e31f5842eebf9b19b48bf1d848fb636e2dbe3e6ea929f6f856d4bf0c647c`
- **Activate**: `0xfc5363d4993ce263b31da440db8041261de3bfa9ba75f9a9e5f943bba4ed469b`
- **Submit A**: `0x8c80ec2514307120dc16024468db7ef3987f87a0188a5625a2ddccd483a4b802`
- **Adjudicate A**: `0xb698cd9906c69007f18881fdd5f878679d6598d3267c2da6c24873c566526a68` (PASS + CONTRADICTS)
- **Expire Challenge**: `0x207ca663794f13f8ac68fad42903a8a8f11627c616d2660ebd7f55fad8b1489c` (EXPIRED, refundable_unused = 1, outstanding_pass_reserve = 1)
- **Refund Unused Escrow**: `0xc0c32e20b9c4509a28e0e367802ea1e82a506e837d1e8038abe377a70a8c9a0c` (REFUNDED, 1 wei refunded to sponsor, 1 wei pass reserve retained)
- **Settle PASS Reward from REFUNDED Challenge**: `0x7a704761a62efdf0bfc2189273d92adde96edec59f9ce88e89d882243bd3af72` (PAID, 1 wei transferred to Replicator A, remaining pool = 0)

### Defect 1: Abandoned repairable UNRESOLVED grace protection and non-permanent lock
- **Challenge ID**: `reprobond-live-unres-mvgwqouz`
- **Create**: `0x9cfa6c56cfc1d1a50e5bb295d93dbbe1b806520a7a07128bb81bbba4d62dd07c`
- **Fund** (1 wei): `0x965d3b181161749baf12892f194858a8ffd424756d9bde18d1e8d92be4f2b183`
- **Activate**: `0x9c190a2c9abe17c444b31cd4a682dca466ce1f70c268534cd0d8c0bdc1103212`
- **Submit B**: `0x2ff4a28654e3a7db9de16a233d215545b44718a2f6a5e34e5c6fc5ea619aca4d`
- **Adjudicate B**: `0x93e0b493722b1bdeb9fcb872fbc4570e80e95295eddded4620c2b2192271c0cc` (UNRESOLVED)
- **Sponsor Expiry Attempt during Recovery Grace**: `0x1633015850c703a5e54e20a511e695e69ebfbb9b625ac6332e96c1e3d4e6022a` (Reverted on-chain with `repairable UNRESOLVED replication blocks expiry during the recovery grace period.`)
- **Bounded Non-Permanent Closure**: The recovery window expires at `recovery_deadline_utc` (`deadline_utc + 86400s`), after which `expire_challenge` marks un-repaired work as `ABANDONED` and successfully recovers the challenge escrow.
