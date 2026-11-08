# Nomadic Scene Forge — engineering research and architecture decisions

**Date:** 2026-11-06. **Goal:** own the 3D generation and construction chain, no recurring charge or hosted dependency, support four games over time, and distribute a reusable SDK where licensed.

## What not to build

We should not write a new renderer, reimplement Blender, clone a proprietary API, or train a state-of-the-art multi-billion-parameter 3D model from scratch on 6 GB VRAM. That does not improve the core objective and would consume years. Do not reverse engineer proprietary hosted service internals or copy private weights; **licensed forks and independent implementation of public algorithms** are acceptable.

## Architecture: four distinct asset sources

1. **Parametric authoring (implemented v0):** A coding model or human extracts dimension and composition decisions from artwork into a constrained blueprint. Our own geometry compiler emits glTF GLB and scene metadata. Exact shapes are deterministic and editable; unseen photo geometry must be authored, not guessed as fact.
2. **Height-field reconstruction (implemented v0):** Local grayscale elevation raster → actual terrain triangles; cite projection, horizontal/vertical units and source if real DEM. The synthetic PNG example deliberately has no geographic truth.
3. **Object reconstruction (researched, NOT implemented):** isolate a subject in a reference image, then a locally forked and pinned small 3D reconstruction model provides initial geometry. Needs cleanup, re-topology, UV/PBR, scale, and game import. **TripoSR** is the first candidate because its original research repo states MIT terms for code and pretrained weights; it also states approximately 6 GB VRAM by default for a single image. On GTX 1060 6 GB, memory headroom, CUDA compute compatibility and device contention are unresolved. No guarantee of running the default configuration.
4. **Scene assembly (next):** orchestrate multiple authored/reconstructed assets in Blender, consistent units and coordinates, scene hierarchy, collisions and LODs. Preserve source `.blend`, binary `.glb`, SHA-256, reference citations and all licensing. Return components to any of the four games using engine-specific adapters without assuming identical material/physics semantics.

## Open-code evaluation — primary source findings

| Candidate | Source license | Practical status on user's hardware | Decision |
|---|---|---|---|
| Blender | GPL, open source | Installed Blender 4.5.14 verified in user workstation, plus separate Blender 5.2.3 / Blenderwright 3.0 files. GPU render may pressure existing workloads. | Use as **editor/converter**, not our inference provider. GPL implications apply to redistributed Blender binaries/add-ons; do not conflate Blender's license with our independent Python files. |
| TripoSR original (VAST-AI-Research/TripoSR) | MIT for code + pretrained model, stated in original README | Upstream default ~6 GB VRAM; user has **6 GB total VRAM** with Windows compositor and shared workloads. Exact Windows/CUDA requirements, model size, dependencies and result quality untested. | P1 isolated optional **local** model; test on a single object. No paid Tripo account required. |
| `ahujasid/mcp-for-blender` | MIT code | Public code includes arbitrary Blender Python execution capability and optional hosted generators; project describes telemetry. | **Do not install as core.** Our typed, no-network MCP is simpler to audit. May study/legally fork portions later with retained license if justified; no upstream code copied in this package. |
| InstantMesh | Apache-2.0 main code | Additional dependency/model weight license and VRAM envelope must be separately checked; no 6 GB qualification. | WATCH, no install. |
| Microsoft TRELLIS | MIT code | Official README states minimum **16 GB VRAM**. | EXCLUDE from current target-laptop pipeline. |
| Hunyuan3D-2 | Tencent Hunyuan 3D community license | Distribution and geographic/use restrictions, separate from permissive MIT/Apache terms. | EXCLUDE from future freely redistributable bundle unless separately legally approved. |
| Stable Fast 3D | Separate Stability AI model/repository licensing | Potential output quality gains; both code and weights must be audited independently; cannot treat 'source available' as unconditional redistribution rights. | DEFER pending license/VRAM qualification. |

**Primary project references:**
- https://github.com/blender/blender and https://www.blender.org/about/license/
- https://github.com/VAST-AI-Research/TripoSR (README says MIT including weights; default ~6 GB VRAM)
- https://github.com/VAST-AI-Research/TripoSR/blob/main/LICENSE
- https://github.com/ahujasid/mcp-for-blender/blob/main/LICENSE
- https://github.com/TencentARC/InstantMesh
- https://github.com/microsoft/TRELLIS
- https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE

**Verification levels:** research links and terms verified on 2026-11-06; model CUDA runtime **not executed**; Blender adapter **not executed on real Blender**; only built-in code exercised in this package. License interpretation is engineering risk screening, not legal clearance for commercial distribution.

## Security/privacy policy

- Own stdio MCP client-side transport, no listening socket, no telemetry, no model API keys, no internet requests.
- Fixed tool allowlist; typed schema, bounded resource inputs, no arbitrary Blender Python, shell tools or plugin download path.
- Output confined to preselected root, never overwrite existing art; SHA-256 and manifest with `production_qualified=false`.
- An MCP feature switch does **not** establish Resource Admission or Authority. Integrate both in the real game studio host and include denial/timeout tests.
- No new 3D scene replaces accepted STILLWATER art until approved visual + interactive/native performance evidence. Keep user blind to previews.

## Next proof sequence

1. Run v0 test suite on Windows Python 3.10, verify 5 MCP tools and exported GLBs with Blender importer.
2. Check independent source and geometry against existing reference image; record large deviations rather than claiming photorealism.
3. Prove isolated Blender source `.blend` creation and offline Three.js GLB loading on GTX 1060 under fresh admission.
4. Pin and locally sandbox TripoSR's original code and model weights only if CUDA/VRAM fit. No paid account, keys, or cloud service.
5. Benchmark against a simple authored cabin, a complex organic object and a terrain tile. Compare mesh validity, silhouette, material quality, manual cleanup cost, memory and wall-clock time; reject if worse than deterministic Blender modeling.
6. Package a signed capability for Nomadic Game Studio only after independent test and license/redistribution verification. No claim that Stage 4 or 5 was completed by this v0.
