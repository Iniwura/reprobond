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

Studio Dev chain 61997, production contract 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc.

## Important limitation

ReproBond reports a replication record and deterministic result. It does not claim universal scientific truth.


## Deployment labeling

The displayed live proof is Historical v1 until the corrected contract has a fresh Studio Dev deployment and new live scenario evidence. The corrected release enforces deterministic deadlines, safe partial closure/refund, required-vs-optional evidence, and qualified-slot capacity.
