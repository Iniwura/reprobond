# ReproBond — Portal submission packet

## One-line pitch

ReproBond pays faithful replication, even when the measured result contradicts the sponsor's claim.

## What is live

- Production contract: 0x897a7dF67E638506557985FE795Ff2F762f01607
- Network: GenLayer Studio Dev, chain 61997
- Contract source SHA-256: 5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b
- Historical v1 contract: 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc
- Canonical live challenge: reprobond-steward-consolidated-20261007-b
- Canonical replication: e7de30481ab0395935d39da02f39be5f748a24fb8fb4a329470d4dc51ceca11e
- Verified outcome: PASS + -2500 bps + CONTRADICTS -> PAID
- Verified replay protection: duplicate settlement and duplicate refund rejected with no second payout/refund
- Native reward: 1 wei; unused escrow refund: 1 wei

## Reviewer path

1. Open /create and create a challenge as a sponsor.
2. Fund the exact computed escrow and activate it.
3. Open /challenges/:id and inspect the frozen protocol.
4. Switch to an independent wallet, open /submit, load the challenge ID, bind HTTPS evidence, and enter raw arrays.
5. Open the new replication dossier, adjudicate it, then settle from the stored replicator wallet after PASS.
6. Open /audit to compare the flow with the completed native payout proof.

## Defining property

The contract settlement path checks fidelity state and the stored reward entitlement. It does not branch on result direction. The live case deliberately produced CONTRADICTS and still transferred the exact reward.

## Scope

ReproBond is a bounded protocol for reproducible quantitative/computational claims. It is not universal scientific verification and it does not label claims TRUE, FALSE, PROVEN, or DISPROVEN.


## Steward corrections

The corrected deployment is current production. The old contract is labeled
historical v1 only. The current audit is recorded in
docs/STEWARD_AUDIT_20261007.md, including deadline guards, partial closure,
native payout, refund, and replay transactions.

## Reviewer corrections

The corrected release is intentionally a new deployment, not a patch to the historical address. It adds deterministic transaction-time deadline enforcement, blocks pending-work expiry, preserves earned PASS rewards through partial closure, refunds only unused escrow after PASS payouts, honors optional evidence, and uses qualified_count for slot capacity.
