# ReproBond Steward Audit — Consolidated Live Record

Status: completed for the funded consolidated scenario on Studio Dev, Studio Dev chain 61997, 2026-10-07/08 UTC.

## Verdict

LIVE PAYOUT PROVEN

This record proves the defining production property: a faithful replication reached PASS, its raw values deterministically produced -2500 bps and CONTRADICTS, and the exact reward was transferred natively to the stored replicator. It also proves expiry, unpaid-PASS refund blocking, post-expiry settlement, exact unused-escrow refund, and settlement/refund replay protection.

The live scenario did not create a second replication record. Therefore the separate live assertions requiring a repairable UNRESOLVED record and a nonqualified record competing with qualified slots remain unproven here. Those assertions remain covered by the Direct Mode suite and are not represented as live transaction proofs.

## Deployment

- Contract: 0x897a7dF67E638506557985FE795Ff2F762f01607
- Deployment transaction: 0x4e274c6d87bbe2b51b17c1c17df577b79960705c96e34920854c92502aecc9d4
- Chain: Studio Dev, 61997
- Contract source SHA-256: 5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b
- Historical v1 contract (not current): 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc

Deployment finalized accepted with source verification matching the SHA above. No contract source or behavior was changed during this audit.

## Challenge

- Challenge ID: reprobond-steward-consolidated-20261007-b
- Sponsor: 0xa35dc047f9937bf668743efbdf8ea93b31a55888
- Claim: Optimization X improves mean runtime by at least 20 percent for fixed-demo-workload-v1.
- Creation transaction: 0x62f7764e3638db74145a2337c8a6cd0921917e9cc6a79b92d8df9a1da3d5dd7
- Fingerprint: 10983d19983fddb78274363a0d508e65cc2c4514d96f56f45c55d3e8fd9d5008
- Deadline: 2026-10-07T22:39:08Z
- Required slots: 2
- Reward per qualified replication: 1 wei
- Exact escrow funded: 2 wei
- Final state: REFUNDED
- Final qualified count / required slots: 1 / 2
- Final paid count / paid total: 1 / 1 wei
- Final aggregate result: NOT_READY

Frozen criteria:

1. environment — Linux x86_64, same environment for baseline and candidate, with Studio Dev chain 61997 and genlayer-js 2.0.0-rc.1 as adjudication/transaction metadata; SDK version is not a benchmark execution requirement.
2. trial_count — exactly five baseline and five candidate raw integer trials.
3. analysis_method — candidate_relative_change_bps.v1 from raw arrays; no manually chosen result label.
4. correctness_check — bounded raw arrays and evidence fetched from the committed HTTPS URL.

Evidence requirements were methodology required and optional_code optional. The optional artifact was omitted, which is permitted.

## Replication and evidence

- Replication ID: e7de30481ab0395935d39da02f39be5f748a24fb8fb4a329470d4dc51ceca11e
- Replicator: 0x30fd7e8539a8462591e62894739c6864e9b81fa2
- Evidence URL: https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md
- Studio-rendered evidence SHA-256: c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac
- Baseline runs: [100,100,100,100,100]
- Candidate runs: [75,75,75,75,75]

Authoritative final replication state:

- state: PAID
- revision: 1
- fidelity: PASS
- environment: SATISFIED
- trial_count: SATISFIED
- analysis_method: SATISFIED
- correctness_check: SATISFIED
- derived metric: -2500 bps
- result direction: CONTRADICTS
- reward: 1 wei
- payout fingerprint: 377de96a2591bbe6842b8dd5a459f12f2eb850119e03fb4d2d4e884d4c1a52c5

## Complete transaction record

All entries below are for the current corrected deployment and consolidated challenge. Failed writes are retained because they are part of the security proof.

| Operation | Transaction | Authoritative result |
|---|---|---|
| Create challenge | 0x62f7764e3638db74145a2337c8a6cd0921917e9cc6a79b92d8df9a1da3d5dd7 | finalized, accepted |
| Fund exact 2 wei | 0xec02e6e0c7b9a1590cfe3a253862cc71692f2a8e67aee9c32a139cb8053b6982 | finalized, accepted; escrow 2 |
| Activate | 0x76e65b2ca7341283822957f5a829e9f963534bd239fb98ce23d16e92b47548d1 | finalized, accepted; state OPEN |
| Expire before deadline | 0x376eed9835e14156bf2e8ac946fc40496945f3283ac10e3e59e9265fadbaaa5b | finalized error: challenge deadline has not been reached. |
| Submit replication | 0x1c05e059bb1fcdbdb88c54417b3306b67cbd65b5db7301bac9a62a265570f038 | finalized, accepted; state SUBMITTED |
| New submission after deadline | 0xac3b56bbf412ee97af351b6b303a4d1934c9bb1ea40b85a04106f9852f2bcfb6 | finalized error: new replication submissions is closed after the deadline. |
| Expire while SUBMITTED | 0x8bfef332d77fcb7fba3f85dfe5f4811dc632f92b7b853dce8c8b76f576bd89ea | finalized error: SUBMITTED replication blocks expiry. |
| Adjudicate | 0x3faf090ef9193256d94b53b10264e950edf4f1391d0d8e4181861d0ea16538d1 | finalized, accepted; PASS + CONTRADICTS |
| Expire after pending work resolved | 0x3d41e14e97b22c12bece212408d5363c52b5a0a1162fac24355fb7c907b5a83c | finalized, accepted; state EXPIRED |
| Refund before PASS payout | 0x4bab5d0d61cc06033bdffcad40c48e3608d0828c45fdd652a3b39849be7b95f6 | finalized error: all PASS replications must be paid first. |
| Settlement with incomplete message allocation | 0xe2fad7387428dc692b270756e2f560310dd0411028eefcebcf4bfd92b0a005bd | finalized error: out_of message_fee total # external |
| Settle exact PASS reward | 0x3fca4e4f7832c689a8f16dd60519c52a99397926dea8190ac36ef2c50d9fb3c3 | finalized, accepted; state PAID |
| Native payout child transfer | 0x5ca51a73beaded78be36b5e44d4147f69b1baee80f9a88425a729168e77aaf9c | finalized; contract to replicator; value 1, credited |
| Refund unused escrow | 0x1af3dc97aebf32ec005d0fbc69c9cfa5e3b1a21fc65aa8222a01dcee2faed469 | finalized, accepted; state REFUNDED |
| Native refund child transfer | 0x9176e71c72aea17e3a6a18050a45e93e7a768b99300c99f81f33acef8bf1b2f3 | finalized; contract to sponsor; value 1, credited |
| Duplicate settlement replay | 0x2040f181c1ed4e26ff0d02efb1fda2d11b20b8fd0f8dc839cd6435413ad6cf1e | finalized error: challenge is not settleable in this state. |
| Duplicate refund replay | 0x2b1d510947073364bece2ab87f89ce186414d21793caf00ccf909b6ff2dd1ae7 | finalized error: only EXPIRED challenges can refund. |

## Native payout and refund accounting

The settlement emitted the child transfer above with exactly 1 wei and valueCredited true. The successful settlement consumed a separate primary fee of 126332250000823 wei; message fee consumption was 125000000000000 wei and the unused message fee was refunded by the protocol. The contract-level child transfer decreased the contract balance by exactly the reward amount.

The refund emitted a separate child transfer with exactly 1 wei to the stored sponsor. The refund transaction consumed 126319250000823 wei of primary fee, with the message allocation accounted for separately. Challenge-level accounting is exact: 2 wei funded, 1 wei paid to the replicator, and 1 wei returned to the sponsor; final challenge escrow is zero and state is REFUNDED.

The last authoritative global contract balance was 3000000000001 wei. It includes unrelated historical balance on the same deployment and must not be mistaken for this challenge's remaining pool. The final challenge record is authoritative for this challenge and reports no remaining escrow.

## Replay protection

Both replay writes were actually submitted and finalized as contract errors:

- duplicate settlement left replication state PAID, paid_count 1, and emitted no second child transfer;
- duplicate refund left challenge state REFUNDED, emitted no second child transfer, and returned the exact contract guard text above.

The failed settlement fee-profile attempt emitted no payout and is retained separately from the successful settlement proof.

## Coverage boundary

Live-proven assertions:

- expiry before deadline fails;
- post-deadline new submission fails;
- an existing SUBMITTED replication blocks expiry after deadline;
- a pre-deadline submission remains adjudicable after deadline;
- a partially qualified challenge can expire after pending work is resolved;
- unpaid PASS blocks refund;
- PASS + CONTRADICTS remains payable after expiry;
- exact native payout and exact unused escrow refund work;
- duplicate settlement and duplicate refund are rejected without a second payout/refund;
- optional evidence omission is accepted;
- payout direction is result-neutral for the stored CONTRADICTS case.

Not live-proven in the earlier consolidated funded scenario:

- a repairable UNRESOLVED record independently blocking expiry;
- a separate nonqualified record demonstrating that total record count does not consume qualified slots.

Those two cases were subsequently covered by the separately funded final
dedicated scenario below.

The final dedicated two-record scenario below supersedes that earlier
coverage boundary without changing the completed consolidated challenge.

## Final dedicated two-record scenario

This scenario was funded separately with the one remaining manual funding
signature and was used only for the two outstanding zero-value proofs.

- Contract: `0x897a7dF67E638506557985FE795Ff2F762f01607`
- Challenge: `reprobond-steward-final-slots-20261008-a`
- Challenge fingerprint: `0d7c8c120e00ad4132fa9c0b43a70e42be52b0f8d3fa94ab497309a678b31d83`
- Deadline: `2026-10-08T11:19:11Z`
- Required slots: 2
- Reward per slot: 1 wei
- Exact escrow funded: 2 wei
- Final challenge state: `EXPIRED`
- Final escrow accounting: 2 wei escrowed, 0 wei paid, no refund called
- Final records: 2
- Final qualified count / required slots: 1 / 2
- Final adjudicated count: 3 (the repaired record was adjudicated twice)
- Final aggregate result: `NOT_READY` because only one record qualified

The two records used distinct non-sponsor accounts and the same bounded raw
packet:

```json
{
  "baseline_runs": [100, 100, 100, 100, 100],
  "candidate_runs": [75, 75, 75, 75, 75]
}
```

### Record 1: qualified PASS with CONTRADICTS

- Replication ID: `27b2981b77adc31e71916678451009032196d9cb2621b5a579596f6304148efa`
- Replicator: `0x30fd7e8539a8462591e62894739c6864e9b81fa2`
- Submission state: `SUBMITTED`, revision 1
- Evidence URL: `https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md`
- Studio-rendered evidence SHA-256: `c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac`
- Adjudicated state: `PASS`
- Criteria: environment `SATISFIED`, trial_count `SATISFIED`, analysis_method `SATISFIED`, correctness_check `SATISFIED`
- Derived metric: `-2500 bps`
- Derived direction: `CONTRADICTS`
- This record incremented `qualified_count` to 1.

### Record 2: repairable UNRESOLVED to terminal FAIL

- Replication ID: `8968095fdb6f137ea6edea69381bb413697e1e05c0aa43b0fd9c2bcac7591227`
- Replicator: `0x01feebafdfddd4ba23f69b43f0b501bba7aa7cff`
- Initial submission state: `SUBMITTED`, revision 1
- Initial manifest commitment: deliberately incorrect `ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`
- Initial adjudication: `UNRESOLVED`; all four criteria `UNRESOLVED`; metric `-2500`; direction `CONTRADICTS`
- Failed-repair-block expiry result: exact contract error `repairable UNRESOLVED replication blocks expiry.`
- Repair revision: 2; history length: 1
- Repaired evidence URL: `https://raw.githubusercontent.com/Iniwura/reprobond/bb62fe88a7c6d27a5c975cdca0bb7dbe6476c7ee/fixtures/reprobond-steward-final-slots-20261008-a/fail-methodology.md`
- Studio-rendered repaired evidence SHA-256: `945a6594cc133872807403ad2c1097cbadf837f3bac782daa2d1411830ffd0ff`
- Repaired raw arrays: unchanged, byte-for-byte in canonical JSON
- Repaired adjudication: `FAIL`; environment `VIOLATED`; trial_count, analysis_method, and correctness_check `SATISFIED`
- Repaired metric: `-2500 bps`
- Repaired direction: `CONTRADICTS`
- The terminal FAIL record did not increment `qualified_count`.

### Final dedicated-scenario transaction record

| Operation | Transaction | Authoritative result |
|---|---|---|
| Create final dedicated challenge | `0xc72aaa6a46bfed9c45b91689e98b9c4f0dd1258374bdd94f42efebf7d208bae1` | finalized, accepted; state DRAFT |
| Fund exact 2 wei | `0x8532bedf5c5772e5308c5dac194fd89e3f0b3631fb6e2ca64ff621b279bfb39a` | finalized; `user_value=2`; escrow 2 |
| Activate | `0x19eb75adde3cd23005e2eaf27b05aa12572409b8d2b2397717db7f17cb88d50c` | finalized; state OPEN |
| Submit qualified record | `0x394e4fcb94c3d218633d40471b0cbb40a9d56af8a56a86408c578dbb7c504781` | finalized; record 1 SUBMITTED |
| Submit integrity-failing record | `0x6cee85ff0ba095ff0930ddcd14885a277ca026bb7d68da9a5764ec2991185dbe` | finalized; record 2 SUBMITTED |
| Adjudicate qualified record | `0x0e1285d88920f0f9323a22531f265523f5c0faa85f379166958839d3aa9ad07` | finalized; PASS + CONTRADICTS |
| Adjudicate integrity-failing record | `0x27aa13ef4e9219f39def5bb902ce2d6948a381912f10a2123f518a2e23755bc8` | finalized; UNRESOLVED |
| Expire while repairable UNRESOLVED exists | `0x4e6cfcc05bd2836522e6aa770d868636010a9f11d120b74c4c5c06af75174f19` | finalized; rejected with `repairable UNRESOLVED replication blocks expiry.` |
| Repair record 2 | `0x3a38609b917673ab483cf1c6d1cfc8425a62f99dc001dc649bbab90d0d3ea5aa` | finalized; revision 2 SUBMITTED |
| Re-adjudicate repaired record | `0xb87d866e76f9f397ca08b319f307f4cd9f340e4aa6f996d87315174d4c858cc7` | finalized; FAIL + CONTRADICTS |
| Expire partial challenge | `0xe78cc5033cf981be250f6e85efe8850c224d6de8bcc77dd26d417a60396d3125` | finalized, accepted; state EXPIRED |

The first failed attempt to use the CLI’s automatic fee omission is also
retained as tooling evidence: outer EVM transaction
`0x4d40aa860939bedb171268cecfcf7ca9d1559f87e9813f44428971b614b5a0d2`
reverted with `FeeValueMustBeNonZero(1)` before contract execution. The
authoritative expiry proof is the later finalized transaction above, submitted
with the supported nonzero GenLayer fee deposit and zero user value.

### Final dedicated-scenario proof

The final state proves all requested properties without another payable action:

- A repairable `UNRESOLVED` replication blocked expiry after the deadline with
  the exact contract guard error.
- Repair preserved the record history and both raw arrays, then produced
  terminal `FAIL` from the explicit environment violation.
- There are exactly 2 replication records, but only 1 qualified record, while
  the required slot count remains 2.
- The nonqualified FAIL record therefore did not consume a qualified slot.
- Once no `SUBMITTED` or repairable `UNRESOLVED` record remained, the same
  partially qualified challenge expired successfully after the deadline.
- No payout or refund was performed in this dedicated scenario; its 2 wei
  escrow remains untouched for audit isolation.

The disposable render probe independently confirmed the repaired artifact
before repair: transaction `0xda7b58a3e514466efbc4f35636227095d561a81047c72ba4f7c4f55812328dd9`
returned success, rendered length 1573, and SHA-256
`945a6594cc133872807403ad2c1097cbadf837f3bac782daa2d1411830ffd0ff`.
The earlier wrong-URL and mismatch diagnostics were finalized as
`0xb76b160b30258d07c27c1b67e4eb278bc5e8e753a80338a4f0b198c06af7318c` and
`0x54ccf0d048f481ba732c82ae566efbae1bd61819f8e36e43bbba26b27764ad77`.

## Verification commands/results

The contract source remained unchanged. Final local verification was rerun after the replay checks:

- Direct Mode: 109 passed;
- frontend tests: 20 passed;
- lint: passed;
- validation: passed;
- schema: passed;
- typecheck: passed;
- frontend build: passed.

Current source fingerprint:

5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b

