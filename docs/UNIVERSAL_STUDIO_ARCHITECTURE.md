# Nomadic Game Development Studio — Engine-Neutral Architecture Decision

**ADR NGDS-001 • 2026-11-08 • ACCEPTED DIRECTION / NOT YET INTEGRATED**

## Non-negotiable requirement

Nomadic Game Development Studio must support **any game engine through a qualified adapter**, not be tied to browser games, Three.js, Unity, Unreal, Godot, or one graphics API. A common interface is not proof that every engine already works. Preserve each existing game project, engine, source history, ownership and graphics quality gate.

The studio is the **control plane, visual quality loop and shared asset pipeline**. The game's own engine remains the **runtime and source of truth**. The studio must NOT secretly replace the renderer, migrate project formats, or impose WebGPU on every engine.

## High-level architecture

```text
                         Creative brief + approved visual references
                                      |
                                Studio Workspace
                         Project registry / jobs / reviews
                                      |
                             AI Agent / Model Gateway
                    Local model or BYOK optional, never mandated
                                      |
                    Planning and typed capability-discovery
                                      |
                Authority / per-project lease / Resource Admission
                                      |
                  Transaction Journal + Artifacts + Evidence
                         /            |            \
              Engine Adapter    Asset Pipeline    Independent QA
               (per engine)    Blender/gltf/USD    Sightline/eval
                 / / | \        license+hashes      captures+metrics
              Three.js Godot Unity Unreal ...   (native target hardware)
                      |
                Original project files / original engine
```

**Critical separation:** a shared scene *intent* or asset description is not a universal native level format. Unity's GUID/meta/prefab system, Unreal's package/actor references and transactions, Godot scenes/resources, Three.js scene code and PlayCanvas entity hierarchy each have different semantics. The adapter owns native IDs, units, file movements, import APIs, undo, asset graph and save/commit. Never round-trip proprietary/project-native data through lossy glTF and overwrite the original.

## Canonical core contracts

Implemented and source-tested first layer: `studio/universal-core.mjs`, `studio/research-catalog.json`, `studio/tests/universal-core.test.mjs`.

- `ngds.project-context/1`: exact project ID, engine ID, absolute project root and exact revision. Project root is **metadata**, not authorization; a trusted host must bind filesystem identity and owner leases.
- `ngds.engine-adapter/1`: exact adapter ID, engine ID, source SHA-256, qualification status, evidence pointers and per-method verified capability/effect.
- `ngds.operation/1`: explicit namespaced operation. Only limited common verbs are recognized for contract v1: `scene.inspect`, `scene.preview`, `scene.commit`, `scene.rollback`, `asset.inspect`, `asset.import`, `render.capture`, `project.playtest`, `project.build`.
- `ngds.operation-receipt/1`: exact bound intent digest, source-before/after hashes, native evidence hash and reference image hashes if claiming accepted visuals. **Receipt schema validity does not prove evidence was genuinely obtained**.
- The `assessOperation` function is pure planning. It *never executes* edits, grants access, starts a model, renders frames or signs admission; it returns only an external-admission recommendation.
- `studio/cli.mjs catalog` lists researched engine routes; ALL listed adapters remain `RESEARCH_ONLY` until specific production tests exist. No false "Unity supported" or "Unreal integrated" claim.

## Required next contract revisions (not implemented)

1. **Scene target identity**: native node/entity/actor GUID, serialized stable project path, component/material identity, scene revision, instance index, world/local coordinates, units, handedness and up-axis.
2. **Capability negotiation**: read/preview/write/build/capture separately, environment and engine version range, actual adapter binary hash and signed qualification receipt, CPU/GPU requirements, failed-operation recovery. Unknown must fail closed.
3. **Project transaction**: immutable original, isolated temp checkout, explicit plan/patch, one bounded reviewed change, native Editor undo/reference-safe APIs, content hash comparison, restore and rollback across crash.
4. **Portable asset record**: content-addressed `.glb` where supported; USD where supported; materials, textures, mesh LODs, license, units, rig/animation, collision and native-import mapping; retain native file as authoritative.
5. **Visual evidence**: matched render backend, GPU, camera, FOV, resolution, clock/weather, source/asset versions, reference-image hashes and independent human or review model critique. Raw SSIM alone is never aesthetic certification.
6. **Playtest evidence**: deterministic clock/input/seed where feasible, loading and physics tests, native device fps/p50/p90/p99, memory, crashes and offline requirements.
7. **Agent portability**: local LLM, MiniMax, ZCode, Codex or other authorized model sees the same typed tool schema and evidence; no hardcoded provider or cloud account.

## Engine-specific adapter boundary

| Engine | Native authoritative approach | First dependency / caution |
|---|---|---|
| Three.js | Runtime read/provenance + AST/source change transaction | Do not mutate production page from external arbitrary JS |
| Godot | EditorPlugin + EditorInterface + EditorUndoRedoManager + scene/resource IDs | Per-project plugin installation and Godot-version qualification |
| Unity | UnityEditor C# EditorWindow / AssetDatabase / Undo / Asset GUIDs | Keep .meta, prefabs, script reload and UPM licensing correct |
| Unreal | Editor Python / Blueprint utilities / Actor and Asset APIs / ScopedEditorTransaction | Editor-only Python, .uasset/.umap reference safety, Epic license |
| Blender | bpy in controlled headless process + deterministic export | GPL compatibility, addon/license scope, resource admission |
| PlayCanvas | Stage + Editor/scene APIs + source persistence | Requires PlayCanvas-specific runtime/editor; don't impose it |
| Bevy/Fyrox/Stride/O3DE | Explicit native/plugin adapter contracts | Different maturity/toolchains; no assumption of support |
| Any custom engine | Provider-written adapter implementing contract and evidence | Must not promise unverified capabilities |

Official editor automation references: [Unreal Editor Python](https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python), [Unity AssetDatabase 6000.3](https://docs.unity.com/en-us/engine/6000.3/script-reference/unityeditor/assetdatabase), [Godot EditorInterface](https://docs.godotengine.org/en/stable/classes/class_editorinterface.html), [PlayCanvas Stage](https://github.com/playcanvas/stage).

## Low-friction studio interaction

1. **Select actual existing project**: detect engine, native editor, revision, dirty state, assets, resource availability; make no writes.
2. **Request one concrete outcome**: e.g. "the cabin and spruce silhouettes should match the approved references at this camera, keeping 60 FPS".
3. **Inspect**: independent native capture; identify scene object, file path, material, transform; list selected assets/licenses.
4. **Propose**: bounded patch/command plus expected visual and FPS impact. User can accept/reject; source patch provenance is visible.
5. **Preview in isolation**: native editor or runtime only, exact same camera, version and time; no unrelated source edits.
6. **Verify**: automated geometry/assets/engine tests plus independent visual inspection; GPU profile on target device.
7. **Commit or roll back**: exact authorized files, atomically saved and evidence journaled; no silent reset or scope expansion.
8. **Export**: native engine build, test, package and release only after its own gates.

"Frictionless" means automated routine work **without hiding provenance, failures, approval or costs**.

## Execution sequence

- **P0 (implemented in this repository):** pure engine-agnostic contract + research capability catalog and adversarial tests. No engine is actually connected.
- **P1 (next qualified implementation):** make one *existing* LiveWorld Forge scene round trip through the common contract: discover, inspect, preview, independent screenshot, restore, reviewed source persistence. Build this adapter OUTSIDE active game repos. A failing P1 cannot be waved through with unit tests.
- **P2:** implement read-only Godot and Unity bridges separately. Then exact one-object approved write with native undo and a clean reference project. User's current game projects remain untouched.
- **P3:** Unreal native Editor read-only feasibility on authorized workstation; hardware and license resources first; no UE launch on busy hardware.
- **P4:** interchangeable asset-compiler/generator pipelines, material/rig animation probes, glTF/LOD/KTX2, real-world terrains, approved licensing.
- **P5:** GUI + project discovery + agent session experience + source and evidence history, then independent install tests on Barry/Cody machines.

## Engineering gates before broad marketing

Every adapter must pass: exact project identity; source hash and version; capability negotiation; refusal of unauthorized edits; exact expiry; cross-project isolation; no arbitrary JS/C#/Python bypass; native source preservation; undo after failure/restart; genuine browser/editor capture; independent visual reference; native GPU performance; asset license audit; offline startup; deterministic test fixtures and clean installation. Claims must be per adapter, OS, engine version, tested hardware and evidence date.

**No claim of being better than Godot, Unity, Unreal, Blender or PlayCanvas without explicit comparable tasks, blind outcome review and reproducible benchmarks.** The competitive advantage should be lowering *human coordination work and unverifiable AI errors*, not recreating every editor feature.
