# NGDS Vision P1 — Independent Fixture Evidence Review

**Date:** November 8, 2026
**Status:** Fixture gates A–C supported by reviewed evidence; production use **NOT QUALIFIED**
**Scope:** Public synthetic LiveWorld Forge fixture. No private game assets or screenshots included in this repository.

## What the test demonstrated

A MiniMax-M3.1-Flash session was reported to have inspected a synthetic game scene through direct image attachment and an image-description connector. An isolated Edge/Chromium test generated compositor screenshots while a controlled spectator camera inspected three viewpoints of a planted scene defect.

The captured browser's WebGL context reported ANGLE using an NVIDIA GTX 1060 with a Direct3D 11 backend, rather than SwiftShader. Out-of-process Chrome DevTools Protocol screenshots matched the page's canvas readback at the pixel level in five recorded comparisons. This is meaningful renderer corroboration, **not** a cryptographic signed capture attestation.

A separate scoring harness checked frame-bound JSON defect reports and reported identification of the planted object and defect class at all three viewpoints. One fixture scene object was returned to its starting state through controlled undo.

### Quantitative results reproduced from on-disk evidence

| Evidence check | Result | Assurance |
| --- | --- | --- |
| Five captured PNGs against recorded SHA-256 digests | **5/5 matched** | Independently recalculated from on-disk files |
| Initial frame and restored frame | **Identical SHA-256** | Independently recalculated |
| View A report region / ground truth overlap (IoU) | **0.9449** | Independently recalculated |
| View B overlap (IoU) | **0.9691** | Independently recalculated |
| View C overlap (IoU) | **0.9486** | Independently recalculated |
| Frame-to-scene-revision / object ID bindings | **3/3 recorded as valid** | Scoring script + model report files reviewed |
| Model visual interpretation from a real MiniMax invocation | **Reported by worker; not separately replay-attested** | Summarized connector and direct-input responses, not immutable raw provider trace |
| Improvement in graphical beauty or agent throughput | **NOT MEASURED** | Future controlled benchmark required |

Fixture image-frame digests (no images are published):

- Original / restored: `f94ede82b39cd2962a35a6ae311701c67ae099cc79250b6ba82bfc7d3c8c2d15`
- View A: `eb83b4cc6e4d4f53cb5578fa97406ef1d655f2e614470649278addacb694d71b`
- View B: `63426f20f48037aa4a8e5d2f55970d3166719cf0bb444f027e6b89b6bf856e3c`
- View C: `b553f1b28c7b1dd5597bc111d109a8d5d11d3b83ac703e9bc66532ded11e271c`

The test identified an obvious geometry/transform defect in synthetic 3D art, **not** a subtle photorealistic material or lighting problem.

## Source audit findings requiring correction before P2 claims

1. The scratch pilot calculates one `projectRevision` by hashing a **path string**, not the bytes or Git revision of the target project. Replace this with immutable source and asset provenance.
2. The scratch scoring harness sets `verifiedNative` based on a page-reported GPU string. That is **not sufficient proof** of trusted native render provenance. The underlying World Presence module correctly keeps client-submitted screenshots unverified. Do not promote them via self-reported metadata.
3. The scoring script reads JSON responses from files authored outside the scorer. We need exact model-request/response traces with image digest, prompt digest, model/tool identity and output hash before independent replay assertions.
4. The hidden answer key resides alongside the test-run files. Future blinded benchmarking must isolate the oracle from the model/agent process and preseal it before vision input.
5. Review and sanitize reproducible fixture-runner changes before committing them. Local test evidence may contain user-specific paths, temporary tokens or screenshots and is **not** suitable for indiscriminate public release.

These findings do not negate the measured camera control and pixel restoration. They prevent us from overstating the trust level.

## Acceptance status

- **P0:** Source contracts and isolated World Presence control tests — implemented and tested.
- **P1-A:** MiniMax image comprehension — worker-reported pass supported by recorded image-specific responses; raw provider invocation not independently replayed.
- **P1-B:** Native-GPU composited capture — recorded ANGLE GTX 1060 evidence, corroborated with matching compositor/readback pixels; unsigned provenance remains.
- **P1-C:** Controlled three-view inspection and defect triage — stored reports, image hashes and independently recomputed IoU support fixture pass.
- **P2:** Reversible visual/source correction with authoritative before/after review — **NOT STARTED**.
- **P3:** Blinded source-only versus vision-assisted development benchmark — **NOT STARTED**.
- **Production engine compatibility:** No qualified Unity, Unreal, Godot or production-game adapter.
- **Visual quality improvement:** Not yet demonstrated.
- **Stillwater:** Active development project not modified by this review.

## Next gating action

Under available GPU resources, first correct provenance and model evidence tracing, then execute **one bounded synthetic-fixture art correction**: independent before/after compositor captures, native persistent scene change, reload, independent reference-aware visual review, and exact rollback. After that, run the pre-registered throughput benchmark.

See [World Presence](EMBODIED_AGENT_WORLD_PRESENCE.md), [MiniMax P1 pilot instructions](MINIMAX_VISION_P1_HANDOFF_20261108.md), and [throughput benchmark](THROUGHPUT_EXPERIMENT_PROTOCOL.md).

**Public release policy:** Publish sanitized source, reproducible tests and evidence summaries, not model credentials, private workspace captures, personal browser profiles, or unpublished game source.
