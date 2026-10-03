# ReproBond Invariants

1. Result direction can never alter reward amount: every PASS direction pays exactly reward_per_replication.
2. Sponsor cannot alter a live challenge: claim, criteria, evidence requirements, metric, thresholds, slots, reward, deadline, and fingerprint have no update path.
3. Sponsor cannot receive its own replication reward: sponsor submissions are rejected and payout recipient is the stored replicator.
4. A wallet cannot consume multiple qualified slots on one challenge: one address cannot create a second replication record.
5. A replication cannot be paid twice: only PASS can settle and settlement transitions it to PAID.
6. Challenge cannot pay more than originally funded: exact escrow is required and paid accounting cannot exceed escrow.
7. Failed fidelity never pays: FAIL has no settlement transition.
8. Unresolved fidelity never pays: UNRESOLVED has no settlement transition until bounded repair returns it to SUBMITTED and a later adjudication produces PASS.
9. Missing or malformed evidence never becomes PASS: fetch failure, empty content, hash mismatch, malformed model output, or validator disagreement fails closed to UNRESOLVED or a rejected adjudication.
10. Aggregate uses only qualified replications: only PASS records contribute to the challenge-level result.
11. Model output never directly controls numeric settlement: raw integer arrays are stored and the contract derives the metric and direction.
12. Historical evidence/manifests cannot be rewritten: every repair stores a new revision and preserves prior history.
13. Every payout is attributable to a specific immutable replication fingerprint: settlement uses the replication ID, stored revision, stored replicator, and exact reward.
14. Escrow is exact: activation is impossible unless the funded amount equals the full reward pool.
15. Live state transitions cannot be bypassed: each write enforces its state and caller preconditions.
16. Qualification is result-neutral: SUPPORTS, CONTRADICTS, and INCONCLUSIVE each produce the same PASS entitlement.
17. A final-slot race cannot overfill the challenge: every adjudication rechecks the qualified count in the serialized contract state.
18. Repair history is bounded: no unbounded revision or evidence-history growth is possible.
19. The quantitative formula is fixed per challenge: v1 accepts only candidate_relative_change_bps.v1.
20. Native transfers are isolated: rewards and unused escrow use the narrow supported native-transfer path; no internal-credit substitute exists.
21. Deadline enforcement uses deterministic transaction time, never host wall-clock time.
22. Deadline closes new participation only; already-submitted work remains resolvable and settleable after the deadline.
23. Expiry cannot close while SUBMITTED or repairable UNRESOLVED work exists.
24. Terminal UNRESOLVED is never relabeled as FAIL merely to enable expiry.
25. PASS entitlements survive EXPIRED; refund cannot execute while any PASS is unpaid.
26. Refund equals escrow_funded - paid_total, cannot exceed unused escrow, and is one-shot.
27. Qualified slot capacity is qualified_count, not total replication record count.
