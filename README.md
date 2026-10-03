# ReproBond

ReproBond is a GenLayer protocol application for funded, independent replication.

> Faithful replication gets paid. Even when the result disagrees.

A sponsor preregisters a quantitative claim and freezes the protocol criteria, evidence requirements, metric, thresholds, replication slots, reward, deadline, and fingerprint. A replicator submits immutable public evidence plus bounded raw quantitative values. GenLayer evaluates only the semantic fidelity of that replication. The contract deterministically calculates SUPPORTS, CONTRADICTS, or INCONCLUSIVE, and pays exactly the same reward whenever fidelity is PASS.

ReproBond does not claim universal scientific truth. It reports the protocol record and the deterministic result.

## Product surface

The frontend is a complete protocol application, not a read-only explorer:

- /create — create a challenge, then fund its exact escrow and activate it.
- /challenges — inspect the canonical challenge and look up any challenge by ID.
- /challenges/:id — read the authoritative frozen criteria, evidence requirements, thresholds, slots, aggregate state, and replication records.
- /submit — load any challenge, validate its evidence manifest and raw arrays, preview the deterministic metric, and submit from an independent wallet.
- /replications/:challengeId/:replicationId — inspect the immutable dossier, adjudicate a submission, and settle a PASS replication from the stored replicator wallet.
- /audit — the completed live audit presented as proof that the settlement law works.

Wallet writes use the proven direct EIP-1193 / Rabby or MetaMask path with genlayer-js 2.0.0-rc.1. The app refreshes the fee profile immediately before signing, waits for GenLayer decision and finalization, requires successful execution, and rereads authoritative state.

## Protocol law

~~~text
PASS + SUPPORTS      -> PAY
PASS + CONTRADICTS   -> PAY
PASS + INCONCLUSIVE  -> PAY
FAIL                 -> NO PAYOUT
UNRESOLVED           -> NO PAYOUT YET
~~~

The UI never accepts a result label as input. It accepts raw integer arrays and validates the evidence manifest against the frozen requirement IDs. The contract remains the source of truth.

## Architecture

~~~mermaid
flowchart LR
  Sponsor[ sponsor wallet ] -->|create / fund / activate | UI[ReproBond UI]
  Replicator[ replicator wallet ] -->|submit raw packet | UI
  UI -->|fee-aware GenLayer writes | IC[ReproBond Intelligent Contract]
  IC -->|semantic adjudication | GL[GenLayer validators]
  GL -->|criterion statuses | IC
  IC -->|integer metric + direction | Record[immutable replication record]
  IC -->|PASS only | Payout[native GEN reward to stored replicator]
~~~

The historical v1 contract is preserved for audit reference. The corrected contract is deployed separately only after the revised source passes local and live verification.

## Historical v1 deployment

- Contract: 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc
- Network: Studio Dev, chain 61997
- Contract source SHA-256: 0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc
- Completed live case: reprobond-corrected-20261001-a
- Replication: d3dfda779724b60dacba75d35ba1ec260c0f82898facc9a610e404452606f5e4
- Outcome: PASS, -2500 bps, CONTRADICTS, PAID
- Reward: 1000000000000 wei
- Replay: rejected before a second transaction was submitted

The authoritative evidence trail is docs/LIVE_AUDIT_FINAL.md.

## Local development

~~~bash
cd frontend
npm install
npm run dev
~~~

The local dev server is configured for http://127.0.0.1:4176. The production Vercel deployment rewrites deep links to index.html.

Checks:

~~~bash
npm test
npm run build
~~~

Contract checks are documented in docs/DEPLOYMENT_AUDIT.md.

## Safety boundaries

- Never use the live proof as a substitute for a new challenge record.
- Never enter SUPPORTS, CONTRADICTS, or INCONCLUSIVE as a submitted result.
- Use Studio-rendered evidence commitments, not raw transport-byte hashes.
- Treat fetched evidence and model output as untrusted.
- Verify the authoritative challenge and replication state immediately before every write.
- The app does not export or request private keys.


## Corrected deployment status

The reviewer-correction candidate is a new source revision and must use a new Studio Dev address. It is not represented as current production until deployment and fresh live verification complete.

- Candidate source SHA-256: 5affb19a46630e30b1e97778f46eca1fea9603db23d4c7b10253f4d1694a7a8b
- Historical v1 address: 0x8F1CeC7cbf0D651561B5ec11049257e6421efEEc
- Reviewer corrections: docs/REVIEWER_CORRECTIONS.md
