# Evidence commitment semantics

ReproBond production source hash at the time of this record:

`0471c6c4f014499a7b1537be7b9b5952aa750d2a220903b5c623bb088d193fbc`

## Finding

ReproBond adjudication hashes the UTF-8 bytes of the string returned by:

```python
gl.nondet.web.render(url, mode="text")
```

It does not hash raw HTTP response bytes. The live methodology artifact was 1,511 raw bytes with SHA-256 `3228adcfd4bdac8f7d17b98611a0f79810d03d5782f1bd25999b7a3d06ff4b67`.

Studio Dev rendered that same public evidence as a non-empty 1,505-character UTF-8 string with SHA-256 `2ee75d11c70aeb697ef3ae73d826494009cd635f7266ec10d0db6300791de516`.

The rendered hash was reproduced by the disposable Studio Dev evidence probe for GitHub Raw `.md`, GitHub Pages `.txt`, and GitHub Pages `.md`; each probe finalized with Studio consensus. The probe source is `/home/ini/reprobond/probes/evidence_render_probe.py`, source SHA-256 `1248c0081c3ec38c53389f213fff0fcdf36ef3c6d24d029f2df8aab232744fdb`.

The bounded probe exposed length and digest, not the returned body. This record therefore does not claim a particular six-byte transformation. The length difference is observed; tooling must use the GenLayer render representation itself rather than assume a local byte transformation.

## Operational rule

Evidence tooling must bind commitments to the exact UTF-8 string produced by the same GenLayer web-render primitive and runtime used during adjudication. A conventional download hash is not sufficient. Validate URLs and commitments with a Studio-compatible diagnostic path when possible.

The live repair being prepared preserves the URL and replaces only the commitment with the proven rendered digest `2ee75d11c70aeb697ef3ae73d826494009cd635f7266ec10d0db6300791de516`. No production repair is performed by this document update.
