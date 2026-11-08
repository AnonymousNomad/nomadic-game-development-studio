# NGDS Visual Quality Gate

**Implemented:** PNG comparison / evidence comparability v0.1. **Not implemented:** artistic judgment, signed capture provenance, model-based repair.

- `visual-gate.mjs`: offline, pure Node.js PNG8 RGB/RGBA decode with CRC checks; rejects incompatible source project, time, camera, FOV, viewport, renderer, and bad image digest. Reports changed pixels, difference ratio, mean channel delta and changed bounding box, without marking any change aesthetically good.
- `compare-frames.mjs`: CLI for two PNGs and two `ngds.capture-manifest/1` JSON documents. Returns nonzero exit codes for comparisons that must not proceed. Does not write or modify source.
- `*.test.mjs`: 17 tests, including a real renderer capture when `NGDS_QUALITY_TEST_PNG` is supplied; otherwise that integration check is correctly skipped.
- `../../modules/alaska-boat-lab/verify-gpu.mjs`: isolated, GPU-admitted Edge fixture exports source-bound manifests and exact-frame local screenshot evidence; these are **not signed native capture attestations**.

## Local usage

```powershell
node studio/quality/compare-frames.mjs BEFORE.png BEFORE.capture.json AFTER.png AFTER.capture.json
```

To run the optional native capture decoder check:

```powershell
$env:NGDS_QUALITY_TEST_PNG='C:\path\to\real-screenshot.png'
node --test studio/quality/*.test.mjs
```

The `sourceSha256` in the captured manifest is calculated from actual bundled file bytes, not a path string. Every comparison must use the exact camera and simulation time. An agent still needs a separate, independent visual reviewer to determine whether a specific edit *improves* the art.

**Security:** No arbitrary source execution, model access, network connection or project write authority from the comparison gate. Browser-reported GPU names are corroboration only. Do not use a passing numerical image comparison as production visual acceptance.
