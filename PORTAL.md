# ReproBond — Portal copy

## Name

ReproBond

## Tagline

Faithful replication gets paid. Even when the result disagrees.

## Description

ReproBond is a GenLayer protocol application for funded, independent replication. A sponsor freezes a quantitative claim, structured protocol criteria, public evidence requirements, a deterministic fixed-point metric, result thresholds, replication slots, rewards, and a deadline. Replicators inspect that immutable record and submit public evidence plus bounded raw quantitative values. GenLayer judges only whether the replication faithfully followed the protocol. The contract calculates the metric, classifies SUPPORTS / CONTRADICTS / INCONCLUSIVE, and pays a PASS replication the exact same reward in every direction.

## Why it matters

Reproducibility usually asks people to trust a narrative. ReproBond turns the most important boundary into an explicit protocol: models read evidence, deterministic code calculates numbers, and payout depends on fidelity rather than agreement. The live production audit proves the defining case: a faithful replication contradicted the sponsor's claim and still received the full reward.

## Live proof

PASS / -2500 bps / CONTRADICTS / PAID

Studio Dev chain 61997, current corrected production contract 0x897a7dF67E638506557985FE795Ff2F762f01607. Historical v1 only: 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc.

## Important limitation

ReproBond reports a replication record and deterministic result. It does not claim universal scientific truth.


## Steward corrections

The corrected deployment uses source SHA-256
5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b.
Canonical live challenge: reprobond-steward-consolidated-20261007-b.
Canonical replication: e7de30481ab0395935d39da02f39be5f748a24fb8fb4a329470d4dc51ceca11e.
The live record proves PASS + -2500 bps + CONTRADICTS -> PAID, exact unused
escrow refund, and replay rejection. The detailed record is
docs/STEWARD_AUDIT_20261007.md.

## Deployment labeling

The old address is historical v1 only. The displayed live proof is backed by
the corrected deployment. The corrected release enforces deterministic
deadlines, safe partial closure/refund, required-vs-optional evidence, and
qualified-slot capacity.
