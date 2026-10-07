# ReproBond Final Live Audit

> Current authoritative record: [STEWARD_AUDIT_20261007.md](STEWARD_AUDIT_20261007.md)

Current production contract: `0x897a7dF67E638506557985FE795Ff2F762f01607`

Historical v1 contract only: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`

Current source SHA-256: `5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b`

Current canonical consolidated challenge: `reprobond-steward-consolidated-20261007-b`

The detailed current record distinguishes live proofs from Direct Mode-only coverage.

---

## Archived prior v1 record


Status: completed on Studio Dev, chain `61997`.

## Final verdict

`LIVE PAYOUT PROVEN`

The corrected production replication reached `PASS`, derived `CONTRADICTS`
from the raw numbers, and paid the exact reward by a finalized native
contract-to-EOA transfer. The duplicate settlement attempt was rejected during
fee-estimation simulation before a second transaction was submitted. That is
the expected replay-protection result, not an audit failure.

## Frozen production identifiers

- Contract: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`
- Contract source SHA-256: `0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc`
- Challenge: `reprobond-corrected-20261001-a`
- Sponsor: `0xa35dc047f9937bf668743efbdf8ea93b31a55888`
- Replicator: `0xd0dd02322AF812fC0dbDdC69f9a055FBBe2C6673`
- Replication: `d3dfda779724b60dacba75d35ba1ec260c0f82898facc9a610e404452606f5e4`
- Evidence URL:
  `https://raw.githubusercontent.com/Iniwura/reprobond/f6d0e4624e01768738d4edfc876894143ee85e08/fixtures/reprobond-corrected-20261001-a/methodology.md`
- Studio-rendered evidence SHA-256:
  `c124fdfed85d6ef4ef3f301c854994187151f3f35587d37166dbbde3f59bccac`
- Baseline: `[100,100,100,100,100]`
- Candidate: `[75,75,75,75,75]`

## Authoritative transaction record

All six submitted production writes below finalized with execution result
`FINISHED_WITH_RETURN` and consensus `MAJORITY_AGREE`, unless stated otherwise.

| Operation | Transaction |
|---|---|
| Create challenge | `0x4b56c9c76ca972ba23fcf1680b45d3b7727e95ddedf015b46b1ee9daf59ab35b` |
| Fund challenge | `0xcb7cffd17604e0bf28be72c8b480a4e41929d0e94b13350e74c3941c04c8957a` |
| Activate challenge | `0x1afc32359c4d54f7fbdb167cde04fc377b9c7e5f3144142de5a0aeaf1e84394c` |
| Submit replication | `0xc487364a7fb62b1ccbe4056272b7a061af5b854bf7cc84b11b653e846c760923` |
| Adjudicate replication | `0x6d041228ae9b9bb5fae4702f401abc09c66392ebe0c42dfd10feaf4cf6c804f6` |
| Settle replication | `0xb6aa058fe968762a0ee709ccc658e47486dc1fbec070042db2f6b520e90b7dbd` |
| Duplicate settlement | **NO TX SUBMITTED** |

The native payout child transfer emitted by settlement was:

`0x949b930114ddbfcd1945002515dad7a0b64f16445f499e168699325e75b28d13`

It was finalized, had `value = 1000000000000` wei, was credited to the
replicator, and was triggered by the settlement transaction with execution
stage `finalized`.

## Result and payout proof

Authoritative post-settlement replication state:

- state: `PAID`
- fidelity: `PASS`
- environment: `SATISFIED`
- trial_count: `SATISFIED`
- analysis_method: `SATISFIED`
- correctness_check: `SATISFIED`
- derived metric: `-2500` bps
- result direction: `CONTRADICTS`
- reward: `1000000000000` wei
- payout fingerprint:
  `0b48014d554db27f65394980e694ab5867ad68506fef2e3f75e22f0480000bbd`

The settlement caller was the stored replicator. The deployed source checks
`replication.state == PASS`, checks that the caller equals the stored
replicator, increments `paid_count` and `paid_total`, marks the replication
`PAID`, and emits exactly the stored reward. Result direction is included in
the payout fingerprint audit data but does not change the reward amount or the
eligibility condition.

### Settlement balances

| Quantity | Before settlement | After settlement |
|---|---:|---:|
| Contract native balance | `3000000000000` wei | `2000000000000` wei |
| Replicator native balance | `7986232750749956610` wei* | `7986107418999955787` wei |

*The pre-settlement replicator balance is an exact accounting reconstruction
from the authoritative post-settlement balance, the exact gross child transfer,
and the settlement fee; no intervening replicator transaction was present in
the audited history. The settlement transaction fee was
`126331750000823` wei. Therefore:

```text
net wallet change = 1000000000000 - 126331750000823
                  = 873668249999177 wei
```

The contract balance decreased by exactly `1000000000000` wei. The fee was
paid separately by the transaction sender and was not counted as part of the
native payout. The challenge record remains `OPEN` because only one of three
qualified slots is complete; its remaining reward pool is:

```text
escrow_funded 3000000000000 - paid_total 1000000000000
= 2000000000000 wei
```

The authoritative challenge counters after settlement are:

- `qualified_count = 1`
- `adjudicated_count = 1`
- `paid_count = 1`
- `paid_total = 1000000000000` wei
- `aggregate_result = NOT_READY`

## Replay verification

The runner attempted the duplicate settlement using the same challenge and
replication IDs. The GenLayer SDK performs fee estimation by simulating the
write before wallet signing/submission. That simulation returned:

- error type: `InvalidInputRpcError`
- RPC code: `-32000`
- details: `execution failed`
- execution result: `ERROR`
- decoded contract error: `only PASS replications can be paid.`
- encoded simulation payload:
  `AW9ubHkgUEFTUyByZXBsaWNhdGlvbnMgY2FuIGJlIHBhaWQu`

Because the replication was already `PAID`, the contract's first settlement
guard rejected the replay during fee estimation. Consequently:

- replay transaction hash: **NO TX SUBMITTED**
- replay receipt/finality: not applicable
- replay transaction fee: `0` wei; no wallet signature or submission occurred
- replication state remained `PAID`
- `paid_count` remained `1`
- reward remained `1000000000000` wei
- contract balance before/after replay: `2000000000000` /
  `2000000000000` wei
- replicator balance before/after replay:
  `7986107418999955787` / `7986107418999955787` wei
- second gross reward transfer: `0` wei

This proves duplicate settlement cannot create a second payout through the
runner's fee-aware path, and the deployed contract's `PAID` state prevents the
same replication from being paid again.

## Contract schema and caller rules used in the audit

The final generated schema contains 15 methods: 6 views and 9 writes. The
relevant write signatures are:

```text
create_challenge(string, string, list[dict], list[dict], string, int, int, int, int, string)
fund_challenge(string) payable
activate_challenge(string)
submit_replication(string, list[dict], list[int], list[int])
adjudicate_replication(string, string)
settle_replication(string, string)
```

Caller rules exercised by the audit:

- activation: sponsor only;
- submission: non-sponsor, with one slot per address;
- adjudication: any caller permitted by the deployed source;
- settlement: the stored replicator only, and only while the replication is
  `PASS`.

## Final local checks

These were rerun against the unchanged
`contracts/repro_bond.py` source:

- Direct Mode: **88 passed in 12.83s**
- `genvm-lint lint`: **passed, 3 checks**
- `genvm-lint validate` with `GENVM_VERSION=vstudio-dev`: **passed**;
  ReproBond, 15 methods, 6 views, 9 writes
- `genvm-lint schema --json` with `GENVM_VERSION=vstudio-dev`: **passed**;
  exact 15-method schema extracted
- `genvm-lint typecheck` with the pinned virtualenv on `PATH` and
  `GENVM_VERSION=vstudio-dev`: **passed, no type errors**

The project directory is not a Git repository, so Git diff/status is not
available. The source SHA-256 above is the immutable audit identifier used
instead. No contract behavior or deployed source was modified for this final
audit.
