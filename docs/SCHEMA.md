# ReproBond Public Contract Schema

This schema describes the local steward-fix candidate. It is not the schema
of the historical deployed addresses until a separately approved deployment
is completed.

Contract: contracts/repro_bond.py.

## Writes

create_challenge(challenge_id, claim, protocol_criteria, evidence_requirements, metric_definition, support_threshold_bps, contradiction_threshold_bps, required_slot_count, reward_per_replication, deadline_utc) -> challenge fingerprint

protocol_criteria entries have exactly:
{"criterion_id": str, "requirement": str, "semantics": "HARD"}.

evidence_requirements entries have exactly:
{"evidence_id": str, "requirement": str, "required": bool}.

metric_definition is exactly candidate_relative_change_bps.v1. The support threshold is positive; the contradiction threshold is negative. deadline_utc is an immutable UTC timestamp string supplied by the client.

fund_challenge(challenge_id) -> fingerprint; payable with exact native value only.
activate_challenge(challenge_id) -> fingerprint.
submit_replication(challenge_id, manifest, baseline_runs, candidate_runs) -> revision-1 replication fingerprint.
repair_unresolved(challenge_id, replication_id, manifest, baseline_runs, candidate_runs) -> new revision fingerprint.
adjudicate_replication(challenge_id, replication_id) -> result dictionary.
settle_replication(challenge_id, replication_id) -> payout fingerprint.
expire_challenge(challenge_id) -> state fingerprint.
refund_unused(challenge_id) -> refunded amount.

Manifest entries have exactly:
{"evidence_id": str, "url": str, "sha256": str}.
IDs must match the immutable challenge evidence requirements exactly; required IDs must be present and optional IDs may be included. URLs are HTTPS. sha256 is either empty or a 64-character lowercase SHA-256 digest.

No write accepts a result label, payout amount, payout recipient, or protocol mutation.

## Views

get_challenge(challenge_id) -> dict
get_challenge_fingerprint(challenge_id) -> str
get_replication(challenge_id, replication_id) -> dict
get_replication_history(challenge_id, replication_id) -> list[dict]
get_challenge_replication_ids(challenge_id) -> list[str]
get_aggregate_result(challenge_id) -> str

## Stored fingerprints

Challenge fingerprint binds schema version, challenge ID, sponsor, claim, criteria, evidence requirements, metric, thresholds, slot count, reward, deadline, fixed recovery-grace seconds, derived recovery deadline, and expected escrow.

Submission revision fingerprint binds challenge ID, replication ID, replicator, revision, manifest, and raw arrays.

Result fingerprint binds challenge ID, replication ID, revision, fidelity, exact criterion statuses, deterministic metric, direction, and reasoning.

## Bounds

- Challenge IDs: 1-64 ASCII identifier characters.
- Claim: 1-4000 characters.
- Criteria: 1-8 entries, each ID <=64 and requirement <=1000.
- Evidence requirements: 1-8 entries, each ID <=64 and requirement <=1000.
- Manifest: 1-8 entries, URL <=2048, fetched source <=16384 characters.
- Raw runs: 2-16 integers per series, each 0 <= x <= 10^12.
- Slot count: 1-16.
- Reward: 1 <= reward <= 10^24 wei.
- Thresholds: support 1..100000, contradiction -100000..-1 bps.
- Repairs: at most 2 revisions after the initial submission.
- One challenge: at most 64 distinct replication records.
- Fidelity reasoning: <=1200 characters; source total <=65536 characters.

## Challenge view accounting

`get_challenge` additionally returns `recovery_grace_seconds`,
`recovery_deadline_utc`, `refunded_total`, and these auditable per-challenge
wei values:

- `earned_liability = qualified_count * reward_per_replication`;
- `outstanding_pass_reserve = earned_liability - paid_total`;
- `refundable_unused = escrow_funded - earned_liability`;
- `refundable_remaining = refundable_unused - refunded_total`;
- `remaining_pool = escrow_funded - paid_total - refunded_total`.

`refund_unused` is one-shot and may return `refundable_unused` while PASS
records remain unpaid. `settle_replication` accepts `REFUNDED` challenges and
can spend only the outstanding PASS reserve.

## Recovery semantics

The fixed recovery grace is 86,400 transaction-time seconds. During grace,
`SUBMITTED` and repairable `UNRESOLVED` records block `expire_challenge`.
At or after `recovery_deadline_utc`, the sponsor may close an incomplete
challenge; those pending records become `ABANDONED`, with an appended history
snapshot and `abandonment_reason = RECOVERY_GRACE_EXPIRED`. `ABANDONED` is not
FAIL, does not qualify, and cannot be paid.
