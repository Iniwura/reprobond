# INVALID LIVE FIXTURE CONFIGURATION

This record preserves the negative live audit for challenge
`live-contradiction-20260930-a`. It is an invalid fixture configuration, not a
failure of the ReproBond protocol or of the submitted quantitative packet.

## Production identity

- Network: Studio Dev, chain `61997`
- Contract: `0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc`
- Sponsor: `0xa35dc047f9937bf668743efbdf8ea93b31a55888`
- Replicator: `0xd0dd02322AF812fC0dbDdC69f9a055FBBe2C6673`
- Replication ID: `2b5a86de2a0eaa8c4ad7a3e4b221a5283a014198f315f073176cefb397e164d8`
- Production source SHA-256: `0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc`

## Authoritative transaction trail

All transactions below were read from Studio Dev and finalized with
`FINISHED_WITH_RETURN` execution. No transaction in this record is being
resubmitted by this documentation change.

| Operation | Transaction |
| --- | --- |
| Challenge creation | `0x3bf8f0f5e09efc1e4a7a843d09d200f64644534cdfca5594b1034eea5aa3ada4` |
| Funding | `0x67f110383c4f11e121f077ce454c98389e83ac290f89f8b446eb37ddf9c9a237` |
| Activation | `0xaff9be36a3ff8cbfb70b5002006440802936191598020376df05d00ed08fa666` |
| Replication submission | `0xa7b89bd3c8fa6e252b270602e6760accb476ef13836cd5352fef9667fc3d34e4` |
| First adjudication | `0x308922af6f4783da2f60778694dfda7cd145eeea17c4b52d0709bba6719b084f` |
| Repair to revision 2 | `0x06ac2763cc9936afda1fa12e6f3cfa5604813f97185dbfb3cb0287d33c36178e` |
| Second adjudication | `0xa1678404514d0bdf888debbafa88ed624e03508f4f862937a69b507951e4c1fe` |

### Transaction outcomes

- Funding stored `escrow_funded = 3000000000000` wei and moved the challenge
  to `FUNDED`.
- Activation moved the challenge to `OPEN`.
- Submission stored the replicator's revision 1 packet.
- First adjudication finalized with semantic state `UNRESOLVED`, fidelity
  `UNRESOLVED`, all four criteria `UNRESOLVED`, metric `-2500`, and result
  direction `CONTRADICTS`; its reason was `Evidence unavailable or failed its
  integrity commitment.`
- Repair finalized successfully and created revision 2 while preserving the
  revision 1 history. It changed only the methodology commitment to the
  Studio-rendered digest.
- Second adjudication finalized with `MAJORITY_DISAGREE` / lifecycle
  `UNDETERMINED` and did not mutate application state. Validator feedback left
  the `environment` criterion insufficiently evidenced.

## Frozen mismatch

The immutable `environment` criterion is exactly:

> The public evidence artifact states the execution environment is Studio Dev
> chain 61997 with GenLayer JavaScript SDK 1.2.0 on Linux x86_64.

The actual live transaction path used `genlayer-js 2.0.0-rc.1`. The project
does not have authoritative evidence that the replication experiment itself
ran under SDK 1.2.0; the existing `environment.json` declaration is not enough
to establish that fact. Therefore the live evidence cannot truthfully satisfy
the frozen HARD criterion. This challenge is marked:

**INVALID LIVE FIXTURE CONFIGURATION**

It must not be repaired by fabricating an SDK 1.2.0 claim.

## Current authoritative escrow state

At the time of this record, the challenge read is:

- challenge state: `OPEN`
- `escrow_funded`: `3000000000000` wei
- expected escrow: `3000000000000` wei
- `qualified_count`: `0`
- `adjudicated_count`: `1`
- `paid_count`: `0`
- `paid_total`: `0`
- remaining reward pool: `3000000000000` wei
- replication revision: `2`
- replication state: `SUBMITTED`
- repairs remaining: `1`

## Legitimate recovery path

The deployed source has no automatic deadline check. `deadline_utc` is
immutable data, but `expire_challenge` is a sponsor-only operational write
that accepts an `OPEN` challenge when `qualified_count == 0`; it does not
compare the current time with the stored deadline. The current challenge
satisfies those conditions even though its stored deadline is
`2099-12-31T00:00:00Z`.

Accordingly, the legitimate source-level recovery path is:

1. the sponsor calls `expire_challenge("live-contradiction-20260930-a")`;
2. after that finalizes as `EXPIRED`, the sponsor calls
   `refund_unused("live-contradiction-20260930-a")`;
3. the refund amount is deterministically
   `escrow_funded - paid_total = 3000000000000` wei because there are no paid
   or qualified replications.

`refund_unused` rejects non-`EXPIRED` challenges and non-sponsor callers, and
changes the state to `REFUNDED` before invoking the contract's native transfer
helper. The live native transfer rail has not yet been proven in this audit,
so this document establishes the contract-authorized path, not a live refund
proof. No expiry or refund call has been made.
