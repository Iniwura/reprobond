# ReproBond — Portal submission packet

## One-line pitch

ReproBond pays faithful replication, even when the measured result contradicts the sponsor's claim.

## What is live

- Production contract: `0xBe987E257a07dF2EC17FFcF92764674C5F9b8077`
- Deployment transaction: `0xe4b50cfafb355d2802a4dd5cdd38be1123bbe4a9d167119def7f1dac82b438f5`
- Network: GenLayer Studio Dev, chain 61997
- Contract source SHA-256: `2288bb5ca778860a4f1f18b518e3c9634315838aa6f8d01ca3ab9be6097a1f82`
- Historical v2 contract: `0x897a7dF67E638506557985FE795Ff2F762f01607`
- Historical v1 contract: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`
- Canonical live challenge (Defect 2 Proof): `reprobond-live-pass-mvgv43ca`
- Canonical live challenge (Defect 1 Proof): `reprobond-live-unres-mvgwqouz`
- Canonical replication: `1e511bfa4bc5c480c9d3b47b24372b9f6d96c57c08fc1dde290814112bad3c49`
- Verified outcome: PASS + -2500 bps + CONTRADICTS -> PAID from REFUNDED challenge
- Verified escrow recovery: Sponsor refunded 1 wei unused escrow while unclaimed PASS remained protected in `outstanding_pass_reserve`
- Verified recovery grace & bounded closure: Repairable UNRESOLVED replication protected during 24h grace; expiry reverted on-chain; bounded grace prevents permanent lock

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

## Steward corrections & Live verification

This deployment directly addresses the two material fund-recovery defects identified by the steward:

1. **Defect 1: Abandoned repairable UNRESOLVED record permanently preventing expiry**  
   - *Fix*: Added bounded recovery grace (`RECOVERY_GRACE_SECONDS = 86400`). Repairable `UNRESOLVED` records protect the replicator from early expiry during the 24-hour grace period, and automatically transition to `ABANDONED` once grace expires, permitting full challenge expiry and escrow recovery without permanently bricking the challenge.  
   - *Live proof*: Challenge `reprobond-live-unres-mvgwqouz`. Sponsor attempt to call `expire_challenge` after deadline was reverted on-chain during grace (`0x1633015850c703a5e54e20a511e695e69ebfbb9b625ac6332e96c1e3d4e6022a`), and the challenge state remained protected `OPEN`.

2. **Defect 2: Unclaimed PASS record preventing recovery of unrelated unused escrow**  
   - *Fix*: Decoupled unearned escrow from earned PASS rewards via independent reserve accounting (`_outstanding_pass_reserve`). Unearned escrow is immediately refundable via `refund_unused`, while earned PASS reserves remain protected and payable via `settle_replication` even after the challenge is marked `REFUNDED`.  
   - *Live proof*: Challenge `reprobond-live-pass-mvgv43ca`. Sponsor called `refund_unused` (`0xc0c32e20b9c4509a28e0e367802ea1e82a506e837d1e8038abe377a70a8c9a0c`) receiving 1 wei unused escrow while 1 wei PASS reserve was held. Replicator A then settled from the `REFUNDED` challenge (`0x7a704761a62efdf0bfc2189273d92adde96edec59f9ce88e89d882243bd3af72`) and received their 1 wei reward in full.
