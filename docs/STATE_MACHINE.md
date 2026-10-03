# ReproBond State Machine

## Challenge states

DRAFT -> FUNDED -> OPEN -> COMPLETE

OPEN -> EXPIRED -> REFUNDED

- DRAFT: immutable challenge definition exists, but no escrow is funded.
- FUNDED: exact escrow equals required_slot_count times reward_per_replication.
- OPEN: new replication submissions are accepted only before the immutable deadline.
- COMPLETE: qualified count reaches the required slot count. PASS records may still need settlement.
- EXPIRED: an incomplete challenge was closed by the sponsor after the deadline, only after no pending adjudicable or repairable work remains.
- REFUNDED: terminal state after every earned PASS is paid and unused escrow is returned.

Every create challenge deadline is parsed as exact UTC YYYY-MM-DDTHH:MM:SSZ and must be strictly future relative to deterministic transaction time from gl.message.raw["datetime"].

Legal challenge transitions:

- DRAFT -> FUNDED: sponsor funds the exact escrow before the deadline.
- FUNDED -> OPEN: sponsor activates before the deadline.
- OPEN -> COMPLETE: adjudication adds enough PASS records.
- OPEN -> EXPIRED: sponsor expires after the deadline when the challenge is incomplete and every associated record is terminal or already paid.
- EXPIRED -> REFUNDED: sponsor refunds only after no PASS remains unpaid; refund is escrow_funded - paid_total.
- Challenge definition fields have no update path.

The deadline closes new funding, activation, and submissions. It does not erase already-submitted work: adjudication, bounded repair of legitimate unresolved work, and settlement remain available after the deadline.

## Expiry safety

Expiry rejects:

- any SUBMITTED record awaiting adjudication;
- any UNRESOLVED record whose revision still permits repair;
- a complete challenge;
- calls before the deadline or from a non-sponsor.

A terminal UNRESOLVED record with exhausted repairs may remain unresolved and does not get relabeled as FAIL. PASS entitlements are never erased. An expired challenge may still settle an unpaid PASS, and refund remains blocked until that payout is complete.

## Replication states

SUBMITTED -> PASS
SUBMITTED -> FAIL
SUBMITTED -> UNRESOLVED
UNRESOLVED -> SUBMITTED (bounded repair, revision plus one)
PASS -> PAID

FAIL is terminal for that revision and has no repair path. UNRESOLVED does not consume a qualified slot and can be repaired at most twice. A repair preserves prior evidence in history and returns to SUBMITTED. PASS consumes exactly one qualified slot; result direction never changes its reward entitlement. PAID cannot settle again.

Settlement is allowed for PASS records in OPEN, COMPLETE, or EXPIRED. The recipient and amount come only from the stored replicator and immutable reward entitlement. No public method accepts a payout recipient or a result-based amount.

## Derived aggregation

Only PASS records count. Once the required number of PASS records exists:

- all directions SUPPORTS -> SUPPORTED_BY_REPLICATIONS;
- all directions CONTRADICTS -> CONTRADICTED_BY_REPLICATIONS;
- at least one SUPPORTS and one CONTRADICTS -> MIXED;
- otherwise all INCONCLUSIVE -> INCONCLUSIVE.

Before completion the view returns NOT_READY. These are replication directions, not TRUE, FALSE, PROVEN, or DISPROVEN.

## Atomicity expectations

Qualification stores the result and increments the qualified count before later settlement. Settlement checks PASS, marks the record PAID, updates paid accounting, and emits the native transfer in the same write path. Refund checks the stored accounting before returning only unused escrow.
