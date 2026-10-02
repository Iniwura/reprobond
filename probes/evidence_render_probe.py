# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import hashlib
import json
from typing import Any

import genlayer as gl


MAX_URL = 2048
MAX_HASH = 64
MAX_RESULT_JSON = 2048
MAX_CONTENT = 16384


def _error(code: str) -> dict[str, Any]:
    return {
        "success": False,
        "length": 0,
        "sha256": "",
        "hash_matches": False,
        "error_code": code[:64],
    }


def _evaluate(url: str, expected_hash: str) -> dict[str, Any]:
    try:
        content = gl.nondet.web.render(url, mode="text")
    except Exception:
        return _error("RENDER_EXCEPTION")

    if type(content) is not str or not content.strip():
        return _error("EMPTY_OR_NON_STRING")
    if len(content) > MAX_CONTENT:
        return _error("CONTENT_TOO_LARGE")

    observed_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    if observed_hash != expected_hash:
        return {
            "success": False,
            "length": len(content),
            "sha256": observed_hash,
            "hash_matches": False,
            "error_code": "HASH_MISMATCH",
        }
    return {
        "success": True,
        "length": len(content),
        "sha256": observed_hash,
        "hash_matches": True,
        "error_code": "OK",
    }


def _core(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "success": result["success"],
        "length": result["length"],
        "sha256": result["sha256"],
        "hash_matches": result["hash_matches"],
        "error_code": result["error_code"],
    }


class EvidenceRenderProbe(gl.contract.Contract):
    last_result_json: str

    def __init__(self):
        self.last_result_json = "{}"

    @gl.public.write
    def probe(self, url: str, expected_hash: str) -> dict[str, Any]:
        if type(url) is not str or not url.startswith("https://") or len(url) > MAX_URL:
            raise gl.vm.UserError("invalid HTTPS URL")
        if (
            type(expected_hash) is not str
            or len(expected_hash) != MAX_HASH
            or any(character not in "0123456789abcdef" for character in expected_hash)
        ):
            raise gl.vm.UserError("invalid expected SHA-256")

        def leader() -> dict[str, Any]:
            return _evaluate(url, expected_hash)

        def validator(leader_result: gl.vm.Result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            observed = _evaluate(url, expected_hash)
            return _core(leader_result.calldata) == _core(observed)

        result = gl.vm.run_nondet(leader, validator)
        if type(result) is not dict:
            raise gl.vm.UserError("probe result is invalid")
        bounded = _core(result)
        self.last_result_json = json.dumps(
            bounded,
            sort_keys=True,
            separators=(",", ":"),
        )[:MAX_RESULT_JSON]
        return bounded

    @gl.public.view
    def get_last_result(self) -> dict[str, Any]:
        value = json.loads(self.last_result_json)
        if type(value) is not dict:
            raise gl.vm.UserError("stored probe result is invalid")
        return value
