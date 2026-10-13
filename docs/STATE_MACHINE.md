# ReproBond State Machine

> This document describes the corrected, not-yet-deployed contract candidate.

The frozen deadline is evaluated from `gl.message.raw["datetime"]`, never a
host wall clock. Each challenge deterministically derives a
`recovery_deadline_utc` equal to `deadline_utc + 86,400 seconds`. This
24-hour grace period protects timely pending work while giving the sponsor a
bounded recovery path for abandoned work.

## Challenge states

DRAFT -> FUNDED -> OPEN -> COMPLETE

OPEN -> EXPIRED -> REFUNDED

- DRAFT: immutable challenge definition exists, but no escrow is funded.
- FUNDED: exact escrow equals required_slot_count times reward_per_replication. If its deadline passes before activation, the sponsor may close it to EXPIRED; no replication records can exist in this state.
- OPEN: new replication submissions are accepted only before the immutable deadline.
- COMPLETE: qualified count reaches the required slot count. PASS records may still need settlement.
- EXPIRED: an incomplete challenge was closed after the deadline. Pending work blocks closure until the recovery deadline; after that deadline pending records become `ABANDONED`.
- REFUNDED: unused escrow was returned once. Already-earned PASS reserves remain payable in this state.

Every create challenge deadline is parsed as exact UTC YYYY-MM-DDTHH:MM:SSZ and must be strictly future relative to deterministic transaction time from gl.message.raw["datetime"].

Legal challenge transitions:

- DRAFT -> FUNDED: sponsor funds the exact escrow before the deadline.
- FUNDED -> OPEN: sponsor activates before the deadline.
- OPEN -> COMPLETE: adjudication adds enough PASS records.
- FUNDED -> EXPIRED: sponsor expires after the deadline when the challenge has no replication records. No transfer occurs during expiry; `refund_unused` performs the separate exact escrow recovery.
- OPEN -> EXPIRED: sponsor expires after the deadline. If pending work exists, expiry is blocked during the grace period; at or after recovery it marks pending records `ABANDONED` without relabeling them `FAIL`.
- EXPIRED -> REFUNDED: sponsor recovers only unused slot escrow, independently of outstanding PASS reserves.
- Challenge definition fields have no update path.

The deadline closes new funding, activation, and submissions. It does not erase already-submitted work: adjudication, bounded repair of legitimate unresolved work, and settlement remain available after the deadline.

## Expiry safety

During the recovery grace period, expiry rejects:

- any SUBMITTED record awaiting adjudication;
- any UNRESOLVED record whose revision still permits repair;
- a complete challenge;
- calls before the deadline or from a non-sponsor.

A terminal UNRESOLVED record with exhausted repairs may remain unresolved and does not get relabeled as FAIL. After grace, pending SUBMITTED or repairable UNRESOLVED records become the distinct terminal status `ABANDONED`; they retain their evidence and history, never qualify, and never pay. PASS entitlements are never erased. An expired challenge may still settle an unpaid PASS, including after `REFUNDED`.

## Replication states

SUBMITTED -> PASS
SUBMITTED -> FAIL
SUBMITTED -> UNRESOLVED
UNRESOLVED -> SUBMITTED (bounded repair, revision plus one)
PASS -> PAID
SUBMITTED -> ABANDONED (only during post-grace closure)
UNRESOLVED -> ABANDONED (only while repairable and post-grace)

FAIL is terminal for that revision and has no repair path. UNRESOLVED does not consume a qualified slot and can be repaired at most twice. A repair preserves prior evidence in history and returns to SUBMITTED. PASS consumes exactly one qualified slot; result direction never changes its reward entitlement. PAID cannot settle again.

Settlement is allowed for PASS records in OPEN, COMPLETE, EXPIRED, or REFUNDED. The recipient and amount come only from the stored replicator and immutable reward entitlement. No public method accepts a payout recipient or a result-based amount.

## Escrow reserves

For each challenge the view exposes integer-wei accounting:

```text
earned_liability         = qualified_count * reward_per_replication
outstanding_pass_reserve = earned_liability - paid_total
refundable_unused        = escrow_funded - earned_liability
refundable_remaining     = refundable_unused - refunded_total
remaining_pool           = escrow_funded - paid_total - refunded_total
```

`refund_unused` returns `refundable_unused` once, even if a PASS is unpaid.
The sponsor cannot reclaim the earned reserve. The original PASS replicator
can settle after `REFUNDED`; `refunded_total` is explicitly subtracted from
every later payout check.

## Derived aggregation

Only PASS records count. Once the required number of PASS records exists:

- all directions SUPPORTS -> SUPPORTED_BY_REPLICATIONS;
- all directions CONTRADICTS -> CONTRADICTED_BY_REPLICATIONS;
- at least one SUPPORTS and one CONTRADICTS -> MIXED;
- otherwise all INCONCLUSIVE -> INCONCLUSIVE.

Before completion the view returns NOT_READY. These are replication directions, not TRUE, FALSE, PROVEN, or DISPROVEN.

## Atomicity expectations

Qualification stores the result and increments the qualified count before later settlement. Settlement checks PASS, marks the record PAID, updates paid accounting, and emits the native transfer in the same write path. Refund checks the stored accounting before returning only unused escrow.
