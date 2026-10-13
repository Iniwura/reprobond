# Studio Dev Read-Only RPC Support Report

## Environment

- Network: GenLayer Studio Dev
- Chain ID: `61997` (`0xf22d`)
- RPC: `https://studio-dev.genlayer.com/api`
- CLI: `0.40.0-rc.3`
- SDK: `genlayer-js 2.0.0-rc.1`
- Contract under inspection: `0x33735bbaa9595FBB1b8a9fFCC3A91103911baEdC`
- Test date: `2026-10-13`

## Healthy read-only checks

Fresh HTTP JSON-RPC requests return successfully:

- `eth_chainId` -> `0xf22d`
- `eth_blockNumber` -> `0x6ace1a47`
- `eth_getBalance(contract, latest)` -> `0x2`

These checks show that the endpoint is reachable and basic EVM RPC is
responding.

## Reproduction A: contract view

Fresh CLI process:

```text
genlayer call 0x33735bbaa9595FBB1b8a9fFCC3A91103911baEdC \
  get_challenge --rpc https://studio-dev.genlayer.com/api \
  --args reprobond-steward-recovery-20261012-a
```

RPC method: `gen_call`

Response:

```text
code: -32603
shortMessage: An internal error was received.
details: Can't reconnect until invalid transaction is rolled back.
         Please rollback() fully before proceeding
```

No contract method execution or state mutation was requested by this check.

## Reproduction B: payable fee simulation

A fresh `genlayer-js 2.0.0-rc.1` client loaded the already-unlocked sponsor
account in memory from the CLI keychain. The private key was not printed,
exported, or logged. The concrete simulation request was:

- method: `fund_challenge`
- contract: `0x33735bbaa9595FBB1b8a9fFCC3A91103911baEdC`
- args: `reprobond-steward-recovery-20261012-a`
- user value: `2 wei`

The SDK selected RPC method `sim_estimateTransactionFees` and returned the
same response:

```json
{
  "code": -32603,
  "shortMessage": "An internal error was received.",
  "details": "Can't reconnect until invalid transaction is rolled back. Please rollback() fully before proceeding",
  "causeCode": -32603,
  "causeMessage": "Can't reconnect until invalid transaction is rolled back. Please rollback() fully before proceeding"
}
```

No transaction was signed or submitted.

## Assessment

Basic EVM RPC is healthy, but the hosted GenLayer database-backed execution
paths are unavailable for both reads and fee simulation. The failure is
independent of the local CLI process and signer path. Please inspect and roll
back the invalid server-side database transaction for Studio Dev. No client
attempt should reset the chain or manipulate the hosted database.
