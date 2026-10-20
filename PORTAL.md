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

Studio Dev chain 61997:
- Deployed production contract: `0xBe987E257a07dF2EC17FFcF92764674C5F9b8077` (source SHA-256: `2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82`)
- Deployment transaction: `0xe4b50cfafb355d2802a4dd5cdd38be1123bbe4a9d167119def7f1dac82b438f5`
- Canonical live challenge: `reprobond-live-pass-mvgv43ca`
- Canonical replication: `1e511bfa4bc5c480c9d3b47b24372b9f6d96c57c08fc1dde290814112bad3c49`
- Historical corrected deployment (v2): `0x897a7dF67E638506557985FE795Ff2F762f01607`
- Historical v1 only: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`

## Important limitation

ReproBond reports a replication record and deterministic result. It does not claim universal scientific truth.

## Steward corrections & Live verification

This release resolves the material fund-recovery defects identified in the steward audit:
1. **Unclaimed PASS Escrow Recovery (Defect 2)**: Proved on challenge `reprobond-live-pass-mvgv43ca`. Sponsor refunded 1 wei unearned escrow (`0xc0c32e20b9c4509a28e0e367802ea1e82a506e837d1e8038abe377a70a8c9a0c`) while 1 wei PASS reserve was held; Replicator A subsequently settled and was paid 1 wei from the `REFUNDED` challenge (`0x7a704761a62efdf0bfc2189273d92adde96edec59f9ce88e89d882243bd3af72`).
2. **Abandoned Repairable UNRESOLVED Recovery Grace (Defect 1)**: Proved on challenge `reprobond-live-unres-mvgwqouz`. An early expiry attempt during the 24h recovery grace period was rejected by consensus (`0x1633015850c703a5e54e20a511e695e69ebfbb9b625ac6332e96c1e3d4e6022a`), and the challenge remained protected in state `OPEN`. Once the grace period expires, un-repaired work is marked `ABANDONED` and escrow is recovered, eliminating permanent fund lock.
