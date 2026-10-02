# ReproBond Phase 0: Native Value Transfer Findings

## Scope

Phase 0 was a disposable Studio Dev probe only. The probe contract is not the ReproBond production contract and is not part of the production design.

## Findings

- Studio Dev chain ID: 61997.
- Payable Intelligent Contract writes are supported by the GenLayer protocol and receive native GEN through gl.message.value.
- Current Studio documentation states that native value transfers are supported for local and Studio testing.
- The probe used the current EVM contract-interface transfer mechanism for contract-to-EOA sends: @gl.evm.contract_interface and emit_transfer(value=amount).
- Previous manual probe attempts failed during transaction construction or fee handling before Intelligent Contract execution. The observed FeesDistributionMissing failure transferred no GEN and did not execute the payable contract method.
- The browser harness was updated to obtain a Studio fee recommendation before signing, but no transaction was submitted after that update.
- No successful live contract-to-EOA payout has been demonstrated.

## Gate decision

PAYOUT PATH NOT PROVEN.

Live payout remains a pre-submission integration gate for the deployed ReproBond contract. It is not a production-contract design blocker: production settlement uses the supported native transfer API, keeps the transfer behind one narrow path, and requires a post-deployment live balance proof before Portal submission.

The Phase 0 probe was intentionally stopped. No private key was exported or printed, no wallet credential was committed, and no ReproBond production contract was deployed.
