# ReproBond Threat Model

## Scope and trust boundary

ReproBond is a bounded replication escrow, not universal scientific verification. The contract deterministically owns challenge definitions, escrow accounting, raw quantitative arithmetic, result classification, slot accounting, payout eligibility, payout amount, and refund accounting. GenLayer consensus evaluates only semantic fidelity of a frozen replication manifest and its evidence.

For every threat below:

attack -> invariant -> contract defense -> remaining limitation

### Malicious sponsor

Attack: publish a misleading claim, impossible protocol, or biased evidence requirement.

Invariant: the challenge fingerprint and all protocol/evidence/metric/reward fields are immutable before funding and activation.

Defense: creation records the exact normalized schema; activation is impossible until the exact escrow is funded; no live edit method exists.

Limitation: the contract cannot judge whether the scientific claim is well designed or economically attractive.

### Malicious replicator

Attack: submit fabricated methodology, cherry-picked evidence, or raw values.

Invariant: a replicator earns only after the frozen manifest passes independent semantic adjudication; numeric classification is recomputed from bounded arrays.

Defense: manifest URLs and optional SHA-256 commitments are stored by revision; evidence is fetched independently; model output is schema-validated; raw values never come from a model label.

Limitation: external content can disappear or remain deceptive while being internally consistent.

### Mutable evidence URLs

Attack: a URL serves different content at different times.

Invariant: an evidence revision is bound to its URL and optional expected SHA-256; old revisions are preserved.

Defense: each adjudication fetches the committed URL; a hash mismatch yields UNRESOLVED, never PASS or FAIL.

Limitation: an empty hash intentionally provides availability binding only; sponsors should require hashes for high-value artifacts.

### Evidence disappearance

Attack: a source is unavailable, empty, too large, or cannot be rendered.

Invariant: missing evidence cannot become PASS or FAIL.

Defense: the contract converts the affected adjudication to UNRESOLVED and allows only bounded repairs; no payout is available while unresolved.

Limitation: availability depends on the GenLayer fetch/runtime and the replicator may need a replacement revision.

### Hash mismatch

Attack: fetched bytes do not match the submitted expected SHA-256.

Invariant: integrity failure is UNRESOLVED, not a favorable semantic result.

Defense: the fetch layer computes SHA-256 over bounded rendered text and compares it before prompting.

Limitation: a replicator who omitted a hash receives weaker integrity protection by design.

### Prompt injection inside fetched evidence

Attack: evidence text tells the model to ignore the protocol, reveal secrets, or return a favorable status.

Invariant: fetched content is data, never authority; only exact criterion statuses can affect fidelity, and only fidelity can affect payout.

Defense: prompts delimit source data, forbid instruction following, require exact schema, and validators independently run the same frozen task.

Limitation: models can still disagree or misunderstand ambiguous evidence; disagreement fails closed.

### Fabricated methodology

Attack: label an artifact as a methodology report without satisfying the pre-registered criterion.

Invariant: labels do not establish fidelity.

Defense: the manifest must use exact pre-registered evidence IDs; the model evaluates content against immutable HARD criteria.

Limitation: semantic adjudication is not proof that the experiment occurred in the physical world.

### Fabricated result packet

Attack: submit SUPPORTS, CONTRADICTS, or a hidden favorable result label.

Invariant: result direction is never accepted from user or model input.

Defense: only bounded integer baseline/candidate arrays are accepted; the contract derives relative_change_bps and classification deterministically.

Limitation: the contract cannot detect values that were numerically fabricated but syntactically valid.

### Duplicate identities / repeat slot occupation

Attack: one address submits repeatedly to consume or collect multiple rewards.

Invariant: one address has one replication record per challenge; one record can reach PAID at most once.

Defense: a challenge/address index rejects a second initial submission; revisions are limited to UNRESOLVED records and do not create a second qualification.

Limitation: Sybil identities remain possible; identity is an EOA address, not a person.

### Sponsor attempting to occupy a slot

Attack: sponsor submits its own replication.

Invariant: sponsor cannot qualify or receive its challenge reward.

Defense: submission rejects sender equal to sponsor; payout recipient is the stored replicator address, never a caller-supplied recipient.

Limitation: a sponsor can use another address off-chain; the contract cannot infer common control.

### Sponsor changing protocol after funding

Attack: sponsor attempts to alter claim, criteria, evidence requirements, thresholds, slots, reward, or deadline.

Invariant: a live challenge fingerprint and all economic/semantic fields are immutable.

Defense: there are no update methods after creation; funding and activation only advance state.

Limitation: a sponsor can create a new challenge, which is intentionally a different fingerprint.

### Sponsor cancelling after seeing a contradictory result

Attack: sponsor attempts to expire and refund after a faithful replication contradicts the claim.

Invariant: a PASS result, including PASS + CONTRADICTS, creates a reserved qualification and blocks sponsor expiry.

Defense: expiry rejects any challenge with a qualified PASS; paid and reserved rewards cannot be selectively cancelled.

Limitation: the runtime has no reliable on-chain clock, so manual sponsor expiry is still an operational time attestation; this is a documented integration limitation.

### Rerolling GenLayer after FAIL

Attack: repeat adjudication hoping for a favorable model response.

Invariant: FAIL is terminal for that submission revision.

Defense: adjudication accepts only SUBMITTED; the state transition is one-way to FAIL, and no repair path exists for FAIL.

Limitation: a different replicator may submit an independent replication while slots remain.

### Repeated evidence repairs after UNRESOLVED

Attack: repeatedly replace evidence until a favorable result appears.

Invariant: repairs are revisioned, bounded, and allowed only from UNRESOLVED.

Defense: each repair increments the revision, preserves the prior manifest/result in history, and stops at the fixed repair limit.

Limitation: a bounded repair can still produce a semantically valid but misleading artifact.

### Duplicate payout

Attack: replay settlement.

Invariant: a replication can be PAID only once and paid_total cannot exceed escrow.

Defense: settlement requires PASS, exact stored replicator authorization, state transition to PAID before emit_transfer, and remaining-pool checks.

Limitation: a failed external transfer must be handled by the runtime atomically; the live integration gate must confirm this behavior.

### Race between final replication slots

Attack: two final submissions or adjudications try to consume the last qualification slot.

Invariant: qualified-slot count is updated in the same state transition as PASS; count never exceeds required_slot_count.

Defense: each adjudication rechecks OPEN/SUBMITTED/unique-address state; serialized chain execution makes one call win and the other fail or remain non-qualifying.

Limitation: UI reads can lag; clients must read latest-nonfinal state and handle rejected/stale writes.

### Malformed model output

Attack: leader or validator emits missing fields, duplicates, extra criteria, or invalid enums.

Invariant: malformed output cannot become PASS, FAIL, or a payout entitlement.

Defense: exact top-level and criterion schemas, IDs, enums, list bounds, and reasoning bounds are checked; validator disagreement fails closed.

Limitation: a persistent malformed model/runtime requires a bounded repair or an unresolved outcome.

### Validator disagreement

Attack: leader and validator independently assess different statuses.

Invariant: disagreement is not a pass.

Defense: the validator compares the complete normalized status map for the same frozen evidence; run_nondet rejects disagreement and state is not advanced.

Limitation: consensus availability and validator behavior are external protocol dependencies.

### Arithmetic / overflow issues

Attack: huge arrays or values attempt to overflow sums or metric calculations.

Invariant: monetary and quantitative bounds are enforced before storage or arithmetic.

Defense: run count, value, total magnitude, thresholds, reward, and slot counts are bounded; arithmetic uses integers and a checked deterministic formula.

Limitation: bounds are intentionally conservative and may reject legitimate scientific measurements outside v1.

### Insufficient contract funds

Attack: a payout or refund is attempted without enough escrow.

Invariant: no payout amount may exceed escrow minus prior payouts.

Defense: exact funding is required before activation; settlement checks remaining escrow; refund uses only unused escrow.

Limitation: native transfer execution and fee behavior still require one live post-deployment proof.

### Stale transaction/UI assumptions

Attack: a UI assumes accepted means finalized, or reads finalized state immediately after a write.

Invariant: contract state and payout evidence are evaluated from authoritative finalized/latest-nonfinal reads, not UI optimism.

Defense: the deployment client must preserve transaction IDs, wait for FINALIZED, check execution success, and then re-read state/balances.

Limitation: Studio finality latency and provider display/decimal quirks remain operational concerns.

### Historical evidence rewrite

Attack: a repair mutates the prior evidence record in place.

Invariant: a prior revision remains attributable and queryable.

Defense: repair appends a bounded immutable history snapshot and creates a new revision fingerprint; current state is never the only record.

Limitation: the contract stores bounded history, so a later system cannot retain unlimited revisions.
