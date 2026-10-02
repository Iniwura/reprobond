# ReproBond Public Contract Schema

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

Challenge fingerprint binds schema version, challenge ID, sponsor, claim, criteria, evidence requirements, metric, thresholds, slot count, reward, deadline, and expected escrow.

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
