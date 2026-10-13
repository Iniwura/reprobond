# ReproBond Reviewer Corrections

Status: local correction candidate; not deployed, funded, or resubmitted.

Historical corrected contract: 0x897a7dF67E638506557985FE795Ff2F762f01607
Historical source SHA-256: 5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b
Candidate source SHA-256: 2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82
Historical deployment transaction: 0x4e274c6d87bbe2b51b17c1c17df577b79960705c96e34920854c92502aecc9d4
Historical live record: docs/STEWARD_AUDIT_20261007.md

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

## Release gate

The existing addresses are historical deployments. The old address is
historical v1 only: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`. The
candidate above requires a fresh deployment, a funded live proof covering both
reported defects, and explicit approval before any GEN is spent.

## Migration and live-proof plan (approval required)

No transaction has been submitted for this candidate. The historical address
must remain untouched. Deploy the candidate to a new Studio Dev address, verify
the deployed source hash and 15-method schema, then use two non-sponsor
replicator wallets.

One two-slot challenge can prove both reported defects without overfunding:

| Frozen item | Exact value |
| --- | --- |
| Required slots | 2 |
| Reward per slot | 1 wei (`0.000000000000000001 GEN`) |
| Exact escrow/user funding value | 2 wei (`0.000000000000000002 GEN`) |
| Deadline | fresh UTC value strictly after the authoritative create transaction time |
| Recovery deadline | frozen deadline + 86,400 transaction-time seconds |

Roles: sponsor creates, funds, activates, expires, and refunds; replicator A
submits a valid fixture that adjudicates `PASS`; replicator B submits the same
raw packet with a deliberately unusable integrity commitment so adjudication is
`UNRESOLVED`. The exact evidence fixture and hashes must be prepared and
render-probed before funding.

Sequence and expected authoritative reads:

1. Create and read `DRAFT`, exact fingerprint, deadline, recovery deadline, and
   zero escrow.
2. Sponsor funds exactly 2 wei and read `FUNDED`, `escrow_funded = 2`.
3. Sponsor activates and read `OPEN`.
4. Replicator A and B submit before the deadline; read two `SUBMITTED` records,
   `qualified_count = 0`.
5. Adjudicate A to `PASS` and B to `UNRESOLVED`; read one earned liability
   (1 wei), one outstanding PASS reserve, and two total records.
6. At or after the frozen deadline but before recovery, sponsor attempts expiry;
   it must reject because repairable `UNRESOLVED` work is protected.
7. At or after the recovery deadline, sponsor expires successfully; B becomes
   `ABANDONED`, never `FAIL`, and A remains `PASS`.
8. Sponsor calls `refund_unused`; exact gross refund is 1 wei, with
   `refunded_total = 1`, `outstanding_pass_reserve = 1`, and
   `remaining_pool = 1`.
9. Replicator A settles after `REFUNDED`; exact native payout is 1 wei and
   `remaining_pool = 0`. A duplicate settlement and duplicate refund must
   reject without a second transfer.

Every write must refresh `estimateTransactionFeesForWrite` immediately before
signing and submit the returned `fees.distribution` and `fees.feeValue`.
Therefore the exact user funding amount is fixed at 2 wei, but the native fee
estimate is intentionally not hardcoded: it depends on the deployed address,
current Studio Dev fee profile, and transaction payload. The final release
audit must record the actual fee estimate and signed transaction hashes before
declaring GO. No sponsor approval or wallet signature is requested by this
local candidate change.
