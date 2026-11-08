# Nomadic Game Development Studio

**Status: Experimental public source preview | Last reviewed: November 8, 2026**

Nomadic Game Development Studio (NGDS) is a local-first, engine-agnostic research and engineering project for AI-assisted 3D game development. Its objective is to connect an AI developer to a running game or editor so it can **inspect the scene, observe actual rendered frames, navigate viewpoints, diagnose visual defects, propose bounded changes, and verify the resulting game**.

NGDS is **not currently an integrated game-development application or a replacement for Unity, Unreal Engine, Godot, Blender, or other engines**. The available repository consists of three standalone prototypes, a shared interface foundation, test fixtures, and documented acceptance gates.

## Current engineering status

| Component | Implemented and tested | Remaining qualification |
| --- | --- | --- |
| [World Studio](modules/world-studio/) | Local Three.js scene, typed editor protocol, restricted agent bridge and undo; 13 protocol/MCP tests passed | Production scene integration; native graphics and visual quality acceptance |
| [LiveWorld Forge](modules/liveworld-forge/) | Local interactive scene, imported GLB, typed scene operations, revision checking, persisted state, undo, HTTP/MCP/CLI interfaces; 10 contract/MCP tests passed | General-purpose authoring, secure deployment and game-project adapters |
| [Scene Forge](modules/scene-forge/) | Python-standard-library cabin and heightmap-to-GLB generators, provenance manifests, restrictive MCP interface; 20 tests passed, one optional test skipped | Native Blender end-to-end qualification, reference-accurate assets, rigging and production art |
| [Universal Core](studio/universal-core.mjs) | Engine-neutral project, adapter, operation and evidence contracts; 21 negative/positive tests passed | Trusted external authority, actual native engine adapters and source transactions |
| [World Presence](studio/presence-core.mjs) | Isolated fixture camera inspection, bounded steering, screenshot binding and undo; 14 tests passed | Native cross-engine camera/player control and trusted capture provenance |
| [Vision Triage](studio/vision/minimax-review-contract.mjs) | Frame/revision-bound structured defect reports and refusal checks; 17 tests passed | Direct trusted integration into agent sessions and independent art review |

**Repository regression baseline:** 95 tests passed, zero failed, one optional dependency test skipped, under controlled resource admission on November 8, 2026. These are chiefly contract, source, and isolated HTTP-fixture tests—not a production installation or a claim of photorealistic visual quality.

### Isolated in-world vision pilot

A subsequent experimental run used a disposable LiveWorld Forge scene and a MiniMax-M3.1-Flash session. Its evidence records three controlled camera viewpoints, an apparent native ANGLE/NVIDIA GTX 1060 renderer, compositor images matching local canvas pixels, three defect reports tied to frame hashes, and exact scene restoration after undo.

An independent review recalculated all five stored PNG hashes and three bounding-box IoUs (0.9449 / 0.9691 / 0.9486). **However**, the original provider/model invocation was not independently replayed, compositor evidence is not cryptographically signed by a trusted capture worker, and the fixture is not a production game. **No graphics-quality improvement or development-throughput gain has yet been measured.**

See the [P1 evidence review](docs/NGDS_VISION_P1_INDEPENDENT_REVIEW_20261108.md) for established facts, provenance issues and open gates.

## Architecture

NGDS is designed as a shared control and verification layer **around the game's existing engine**, not a single universal renderer:

1. **Project context:** native engine and version, exact source revision, asset identity, approved visual references and resource limits.
2. **Engine adapter:** engine-native inspection, camera control, object identification, source-safe operations, undo, build and runtime testing. Each capability is explicitly qualified.
3. **Agent interface:** model/provider-independent, typed requests rather than unrestricted arbitrary code execution.
4. **World Presence:** genuine running-scene frames and structured state, with controllable spectator viewpoints and eventually player-input simulation.
5. **Verification:** native render evidence, independent reference-aware visual QA, performance metrics, security gates, persistent source changes and rollback.

Planned adapters include **Three.js, Godot, Unity, Unreal Engine**, and custom engines. **These names describe integration targets, not currently supported production integrations.** Native editor APIs and file formats remain authoritative; exporting a GLB does not automatically preserve engine-native gameplay, prefabs, physics or scripts.

Read the [architecture decision](docs/UNIVERSAL_STUDIO_ARCHITECTURE.md) and [engine adapter acceptance gates](docs/ENGINE_ADAPTER_ACCEPTANCE_GATES.md).

## Reproduce the source and fixture tests

**Prerequisites:** Node.js 20+, Python 3.10+, PowerShell (for the convenience runner). The browser-based demos need a recent desktop browser. The core protocol tests require no cloud account, model weights, or paid API.

From the repository root on Windows:

```powershell
.\RUN_TESTS.ps1
```

Or run the components separately:

```powershell
node --test studio/tests/universal-core.test.mjs
node --test studio/tests/presence.test.mjs
node --test studio/vision/minimax-review-contract.test.mjs

cd modules/world-studio
node --test protocol.test.mjs server.test.mjs mcp.test.mjs
cd ../liveworld-forge
node --test tests/scene-contract.test.mjs tests/mcp-stdio.test.mjs
cd ../scene-forge
py -3 -m unittest discover -s tests -v
```

To inspect researched engine routes without installing an engine:

```powershell
node studio/cli.mjs catalog
```

For the optional local interactive demos, see [World Studio](modules/world-studio/README.md) and [LiveWorld Forge](modules/liveworld-forge/README.md). **Only run experimental servers on localhost with disposable scene data; do not port-forward or connect them to production game projects.** Read [SECURITY.md](SECURITY.md) first.

## Delivery roadmap and acceptance gates

| Stage | Next deliverable | Exit criterion |
| --- | --- | --- |
| **P2 — Graphics repair loop** | One AI-proposed, approved and reversible visual/source change in a disposable game fixture | Matched before/after native frames, independent visual review, persistent scene reload, exact rollback, and corrected capture/source provenance |
| **P3 — Measure development efficiency** | Blinded source-only vs. in-world-vision experiment | Reproducible task bank; measured accepted fixes, quality, wall time, interventions, model cost and GPU performance |
| **P4 — Qualify real engine adapters** | Read-only, then narrowly scoped edits in isolated Godot and Unity projects; Unreal feasibility evaluation | Engine-native IDs and assets preserved; authorization, undo, capture and build evidence passed per engine |
| **P5 — Portable production pipelines** | Asset provenance, Blender/GLB/optional USD interoperability, materials, animation, terrain and LOD optimization | License/asset checks, import-reload correctness, visually accepted outputs and performance budgets |
| **P6 — Integrated studio workspace** | Project selector, scene and source inspection, model-neutral agent sessions, evidence timeline, verified build/export | Clean installation, offline operation where promised, user acceptance and cross-engine regression evidence |

The roadmap is a proposed sequence, not a release schedule or evidence that a stage is finished. Research sources and comparisons are maintained in the [ecosystem report](docs/GLOBAL_OPEN_SOURCE_GAME_STUDIO_RESEARCH_20261108.md) and [43-project matrix](docs/ECOSYSTEM_MATRIX_20261108.csv).

## Explicit limitations

- No verified autonomous graphics repair on a production game.
- No independently qualified Unity, Unreal, Godot or custom-engine integration.
- No general model-agnostic live-vision service available as an installed product.
- No reliable claim that the studio improves development time, visual fidelity, or GPU resource utilization.
- No arbitrary photograph-to-production-ready 3D reconstruction.
- No validated public multi-user service, hosted editor, production installer, or security audit.
- No game source, private assets, proprietary engine binaries, API credentials, or AI model weights are bundled.

See [testing limitations](TESTING_AND_LIMITATIONS.md), [independent P1 review](docs/NGDS_VISION_P1_INDEPENDENT_REVIEW_20261108.md), and [the verification and release policy](docs/VERIFICATION_AND_RELEASE_POLICY.md).

## Licensing and contributions

This is a **public source preview, not a blanket open-source license**. Scene Forge is MIT-licensed and bundled Three.js retains its MIT license. Other original modules are publicly inspectable but have not been granted a general redistribution or commercial-use license; see [RIGHTS_AND_PROVENANCE.md](RIGHTS_AND_PROVENANCE.md).

Reproducible issues are welcome. Include the exact commit, operating system, runtime/engine versions, a minimal synthetic example, expected versus actual behavior, and redacted logs or non-sensitive evidence. Do **not** post access tokens, credentials, private game screenshots, or proprietary assets.

Development and release claims follow the [verification policy](docs/VERIFICATION_AND_RELEASE_POLICY.md): researched, written, implemented, tested, independently verified, accepted, and released are distinct states.
