# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import genlayer as gl
from genlayer.types import Address, u256


class NativePayoutProbe(gl.contract.Contract):
    funder: Address
    recorded_funds: u256
    payout_count: u256
    paid_recipient: Address
    paid_amount: u256

    def __init__(self):
        self.funder = gl.message.sender_address
        self.recorded_funds = 0
        self.payout_count = 0
        self.paid_recipient = Address.ZERO
        self.paid_amount = 0

    @gl.public.write.payable
    def fund(self) -> u256:
        value = gl.message.value
        if value <= 0:
            raise gl.vm.UserError("fund value must be positive")
        self.recorded_funds += value
        return value

    @gl.public.write
    def payout(self, recipient: Address, amount: u256) -> u256:
        if gl.message.sender_address != self.funder:
            raise gl.vm.UserError("only funder may payout")
        if self.payout_count != 0:
            raise gl.vm.UserError("payout already used")
        if amount <= 0:
            raise gl.vm.UserError("payout amount must be positive")
        if amount > gl.contract.get_at(gl.message.contract_address).balance:
            raise gl.vm.UserError("insufficient contract balance")
        self.paid_recipient = recipient
        self.paid_amount = amount
        self.payout_count = 1
        gl.evm.contract_interface(_Recipient)(recipient).emit_transfer(value=amount)
        return amount

    @gl.public.view
    def snapshot(self) -> tuple[Address, u256, u256, Address, u256, u256]:
        return (
            self.funder,
            self.recorded_funds,
            self.payout_count,
            self.paid_recipient,
            self.paid_amount,
            gl.contract.get_at(gl.message.contract_address).balance,
        )


class _Recipient:
    class View:
        pass

    class Write:
        pass
