# ReproBond Invariants

1. Result direction can never alter reward amount: every PASS direction pays exactly reward_per_replication.
2. Sponsor cannot alter a live challenge: claim, protocol criteria, evidence requirements, metric, thresholds, slots, reward, deadline, and fingerprint have no update path.
3. Sponsor cannot receive its own replication reward: sponsor submissions are rejected and payout recipient is the stored replicator.
4. A wallet cannot consume multiple qualified slots on one challenge: one challenge/address index and one PASS/PAID record per address.
5. A replication cannot be paid twice: only PASS can settle and settlement changes it to PAID before transfer.
6. Challenge cannot pay more than originally funded: exact escrow is required and paid_total plus reward must not exceed escrow_funded.
7. Failed fidelity never pays: FAIL has no settlement transition.
8. Unresolved fidelity never pays: UNRESOLVED has no settlement transition until a bounded repair returns to SUBMITTED and is adjudicated.
9. Missing or malformed evidence never becomes PASS: fetch failures, hash mismatches, malformed model output, and validator disagreement fail closed to UNRESOLVED or a rejected adjudication.
10. Aggregate uses only qualified replications: only PASS records contribute to the challenge-level result.
11. Model output never directly controls numeric settlement: raw integer arrays are stored and the contract derives the metric/classification.
12. Historical evidence/manifests cannot be rewritten: repair snapshots preserve prior revision fingerprints and manifests.
13. Every payout is attributable to a specific immutable replication fingerprint: settlement records the replication ID, revision, fingerprint, stored replicator, and exact amount.
14. Escrow is exact: activation is impossible unless gl.message.value equals the full reward pool.
15. Live challenge state cannot be bypassed: submissions, adjudication, settlement, expiry, and refund each enforce their state transition preconditions.
16. Qualification is result-neutral: SUPPORTS, CONTRADICTS, and INCONCLUSIVE each produce PASS and the same entitlement when fidelity passes.
17. A final slot race cannot overfill the challenge: each PASS transition rechecks the qualified count and serial state.
18. Repair history is bounded: no unbounded revision or evidence-history growth is possible.
19. The quantitative formula is fixed per challenge: v1 accepts only candidate_relative_change_bps.v1.
20. Native transfers are isolated: both rewards and unused escrow refunds call one narrow native-transfer helper and no internal-credit balance is used.
