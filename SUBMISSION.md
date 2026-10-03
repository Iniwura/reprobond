# ReproBond — Portal submission packet

## One-line pitch

ReproBond pays faithful replication, even when the measured result contradicts the sponsor's claim.

## What is live

- Production contract: 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc
- Network: GenLayer Studio Dev, chain 61997
- Contract source SHA-256: 0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc
- Canonical live challenge: reprobond-corrected-20261001-a
- Canonical replication: d3dfda779724b60dacba75d35ba1ec260c0f82898facc9a610e404452606f5e4
- Verified outcome: PASS + -2500 bps + CONTRADICTS -> PAID
- Verified replay protection: duplicate settlement rejected with no second payout

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


## Reviewer corrections

The corrected release is intentionally a new deployment, not a patch to the historical address. It adds deterministic transaction-time deadline enforcement, blocks pending-work expiry, preserves earned PASS rewards through partial closure, refunds only unused escrow after PASS payouts, honors optional evidence, and uses qualified_count for slot capacity. Final submission identifiers must be filled only from authoritative Studio Dev reads after the new deployment.
