# ReproBond State Machine

## Challenge states

DRAFT -> FUNDED -> OPEN -> COMPLETE
OPEN -> EXPIRED -> REFUNDED

DRAFT is fully specified but unfunded. FUNDED means the exact required_slot_count times reward_per_replication amount was received from the sponsor. OPEN is the only state accepting initial replication submissions. COMPLETE means the required number of fidelity-qualified replications exists; settlement of PASS records may still be pending. EXPIRED is an incomplete challenge after the sponsor's explicit expiry call. REFUNDED is terminal after unused escrow is returned.

The contract does not use a GenVM timestamp as an expiry oracle because the installed runtime does not provide a reliable on-chain clock. The immutable deadline_utc is a client-visible deadline and expire_challenge is a sponsor-gated operational attestation. Expiry is blocked after any PASS qualification, so a sponsor cannot cancel after seeing a faithful contradictory replication. This limitation remains an integration risk.

Legal challenge transitions:

- DRAFT -> FUNDED: fund_challenge from the sponsor with exact native value.
- FUNDED -> OPEN: activate_challenge from the sponsor.
- OPEN -> COMPLETE: a successful adjudication makes the qualified count exact.
- OPEN -> EXPIRED: expire_challenge, only while incomplete and with no PASS.
- EXPIRED -> REFUNDED: refund_unused after all PASS records, if any, are PAID.
- No challenge definition field is mutable in any later state.

## Replication states

SUBMITTED -> PASS
SUBMITTED -> FAIL
SUBMITTED -> UNRESOLVED
UNRESOLVED -> SUBMITTED (bounded repair, revision plus one)
PASS -> PAID

FAIL is terminal for that revision and has no repair path. UNRESOLVED does not consume a qualified slot and can be repaired at most twice. A repair keeps the same replicator identity, preserves the prior revision in history, and returns to SUBMITTED. A PASS consumes exactly one qualified slot; its result direction is independent of reward amount. A PAID record cannot be settled again.

Settlement is allowed for PASS records in OPEN, COMPLETE, or EXPIRED. The recipient and amount come only from the immutable/current replication record. No public method accepts a payout recipient or a result-based amount.

## Derived aggregation

Only PASS records count. Once the required number of PASS records exists:

- all directions SUPPORTS -> SUPPORTED_BY_REPLICATIONS;
- all directions CONTRADICTS -> CONTRADICTED_BY_REPLICATIONS;
- at least one SUPPORTS and one CONTRADICTS -> MIXED;
- otherwise (all INCONCLUSIVE) -> INCONCLUSIVE.

This reports replication directions, not TRUE, FALSE, PROVEN, or DISPROVEN. Before completion the view returns NOT_READY.

## Atomicity expectations

Qualification increments the challenge count and stores the result before a later settlement call. Settlement marks the replication PAID, increments paid accounting, and emits the native transfer in the same write path. The live deployment gate must confirm the runtime's finalized external-transfer behavior.
