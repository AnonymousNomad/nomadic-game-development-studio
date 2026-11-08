# Global Research — AI-Native, Engine-Universal Game Development Studio
**Research date: 2026-11-08 | Status: RESEARCHED and source-triaged, not third-party deployment-certified**

## Executive finding

The highest leverage path is **not** inventing another full game engine or bundling every editor. We should build a local-first agentic **studio control plane** that can drive professional native editors through explicit, qualified adapters. Reuse existing renderers, asset editors, geometry libraries, physics and standards through legal APIs and standards. Preserve source/project identity, test everything on real hardware and turn accepted edits into native source transactions.

Research scope: seven independent discovery workstreams (engines, browser editors, terrain/world tools, asset pipelines, agent game makers, visual QA, agent-tool security), ~80 initial Exa search results plus targeted official documentation and source repository reads. Presence in search results does not equal full code/security review. Projects with only marketing demonstrations are marked unverified. **Global** means ecosystem-wide across tools/locations and license structures, not an exhaustive index of every project worldwide. The [ecosystem matrix](ECOSYSTEM_MATRIX_20261108.csv) provides source, license, adoption posture, maturity assessment, value and blockers.

## Most actionable projects (verified public source, not installed in our studio)

| Work / official source | What we should learn | Caveat |
| --- | --- | --- |
| [PlayCanvas Stage](https://github.com/playcanvas/stage), MIT | Point-to-entity + exact camera capture; on-device source edit review; code agent shares same context as visual editor; live preview & headless StageCheck | Engine-specific PlayCanvas 2.23+; not a general Three.js attachment |
| [PlayCanvas Editor](https://github.com/playcanvas/editor) + [MCP Editor](https://github.com/playcanvas/mcp-editor), source published | High-quality editor hierarchy, import pipelines, animation graph, material editor, collaboration, API-driven automation | Hosted platform features may differ from self-hosted open code; inspect install requirements and license per component |
| [Pascal Editor](https://github.com/pascalorg/editor), MIT | Persistent local 3D project scene data, authenticated MCP, viewer/editor separation, parametric building editing and capture streams | Architectural building focus; required Node version may exceed current on user's laptop (26.12+ vs installed 26.4), so not install-ready |
| [Three.js DevTools MCP](https://github.com/DmitriyGolub/threejs-devtools-mcp), MIT | Live scene/material introspection, shader & texture metrics, Playwright video/capture, source sync patterns | Public source inspection previously found arbitrary JS execution and loopback auth gaps; DO NOT install unrestricted into actual game |
| [Paprika3D](https://github.com/paprika3d/paprika3d), Apache-2.0 | Deterministic browser input/frame testing, art-reference loops, missing-object inspection, performance budgets, builder/reviewer loop | Reported benchmark improvement is author-reported and not independently reproduced; includes runtime JS evaluation |
| [Gizmo](https://github.com/generalholography/gizmo), Apache-2.0 | Local editor + ECS/physics + MCP + serialized world JSON, persistent scene editing through CLI | Newer/less-proven ecosystem; candidate for architecture, not replacement for all native engines |
| [Stem Studio](https://github.com/Stem-Studio/Engine), MIT | Local browser-based full editor, behavior scripting, physics, local storage, agent/BYOK | Browser-centric; optional cloud provider hooks and Bun dependencies are not universal and require audit |
| [Builders Gate](https://github.com/Thepizzapie/BuildersGate), MIT | Multi-agent seats, SQLite shared tasks, one-seat-per-file locks, reviewer cannot approve own art, Godot/Blender adapters | Large 251-tool surface; Windows/Godot-centric; authorization, tool injection and cost tracking require independent hardening |
| [Godogen](https://github.com/htdt/godogen), MIT | Low-friction game bootstrap into Godot/Bevy/Three.js/Babylon with portable agent guides and asset creation skill | A generator/guide is not operational native app integration; native screenshot/result quality not independently reproduced here |
| [Studio Foundation](https://github.com/lxsolutions/studio-foundation), **PolyForm Perimeter, source-available** | Deterministic headless Blender asset forge, proof-carrying asset manifests, reference gates, reproducible GLB outputs | **NOT permissively open source**; do not copy source without license approval; self-reported test/quality claims require independent reproduction |
| [Oasis](https://github.com/Parzival-Moksha/oasis), repository license must be checked | World persistence, terrain painting, AI prompt-to-scene workflows, bundled CC0 asset libraries | Optional Meshy/Tripo/cloud calls, limited independent evidence; not an offline asset generator out of box |

**Architecture recommendation:** combine the interaction pattern of Stage, structured scene/undo data of Pascal, independent screenshot/playtesting of Paprika, provenance/strict production gates of Studio Foundation (ideas only, no copying), and native editor APIs of Godot/Unity/Unreal. Do not merge any upstream code wholesale, and keep copied-source provenance and license obligations explicit.

## Game engines and editor extension points

| Target | Official API / source | License and integration consequence |
| --- | --- | --- |
| [Godot](https://github.com/godotengine/godot) | EditorPlugin/EditorInterface/UndoRedo; editable scene/resources | MIT; priority native adapter due existing Godot projects. Isolated fixture first |
| [Unity 6000.3](https://docs.unity.com/en-us/engine/6000.3/script-reference/unityeditor/assetdatabase) | `UnityEditor.AssetDatabase`, ScriptableObject, EditorWindow, Undo, GUID/meta | Proprietary engine; write a separate plugin using a real installed licensed editor; never manipulate .meta IDs blindly |
| [Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python) | Editor Python / AssetTools, Editor transaction support | Proprietary/Epic license. Python **editor only**; never manipulate .uasset/.umap as generic disk files |
| [Three.js](https://github.com/mrdoob/three.js) | JS scene graph, renderer inspection, glTF + exact source code patch | MIT; current LiveWorld proof. Separate source/renderer capture from production app |
| [PlayCanvas](https://github.com/playcanvas/stage) | Stage/Editor API/engine entity sources | MIT modules, verify per package; browser/desktop agent bridge |
| [Bevy](https://github.com/bevyengine/bevy) | ECS/Reflect, serializable scenes, Rust plugins | MIT/Apache dual license; editor tooling evolving; custom native adapter needed |
| [Fyrox](https://github.com/FyroxEngine/Fyrox) | Rust native scene-graph editor and animation tools | MIT; candidate independent adapter |
| [Stride](https://github.com/stride3d/stride) | C# editor, game asset system and .NET integration | MIT; candidate independent adapter |
| [O3DE](https://github.com/o3de/o3de) | Large modular C++ engine, Python editor automation and asset processor | Apache-2.0; heavyweight build for GTX1060 laptop; defer installation |
| [Armory3D](https://github.com/armory3d/armory), [UPBGE](https://github.com/UPBGE/upbge) | Blender-connected workflows | zlib / Blender GPL-related obligations respectively; fork/adapt only if real user demand |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | Scene API, material/node tools, physics, browser render | Apache-2.0; independent browser adapter, not same as Three.js |

Engine compatibility is **not** equivalent to glTF import: native scripts, prefabs, scenes, physics, render graphs, timeline, animation/IK and build systems remain engine-specific.

## Procedural worlds, terrain, biome and map ingestion

- [LibreTerrain](https://gitlab.com/libreterrain/libreterrain): claimed node-graph terrain and erosion tool; repo/license/version require verification before copying. Prefer exporting heightmaps and masks rather than swapping renderers.
- [Terrain3D for Godot](https://github.com/TokisanGames/Terrain3D): GPU-backed terrain as a native Godot add-on; supports a Godot-specific pipeline, not Unreal or Three.js by default.
- [WorldEngine](https://github.com/Mindwerks/worldengine): procedural plate/rain/erosion terrain concepts; validate current maintenance and dependency burden. Export engine-neutral rasters.
- [Blosm for Blender](https://github.com/vvoovv/blosm): OSM terrain/building import; **map data, imagery and 3D tiles have separate licenses**, some features paid. No indiscriminate copying of geospatial imagery.
- [utymap](https://github.com/reinterpretcat/utymap): OSM vector ingestion C++ map geometry pipeline. Check date/maintenance.
- Blender Geometry Nodes: terrain/vegetation/scattering through an existing powerful authoring environment; practical asset factory even if game engine is Unity or Unreal.
- TerraForge source-available/commercial variations and World Machine/Gaea are not presumed open source. License and runtime cost must be tested per version.

**Transferable requirement:** world/biome recipe with seed, coordinate reference, chunk/LOD, erosion masks, vegetation densities and data provenance. Export signed source-heightmap/masks/instances/GLBs with native engine loaders; do not build a universal world runtime first. For Stillwater scenic realism, benchmark skyline geometry, terrain materials, foliage LOD transitions and aerial perspective rather than pushing huge demo worlds.

## Portable asset pipeline (actual standards, not wishful conversions)

- [glTF 2.0](https://github.com/KhronosGroup/glTF) and [sample/validation assets](https://github.com/KhronosGroup/glTF-Sample-Assets): default portable **renderable asset** container, not an entire universal game level. Record units, coordinate transforms, UVs, materials, skins, animation, collisions separately.
- [glTF-Transform](https://github.com/donmccurdy/glTF-Transform), [meshoptimizer](https://github.com/zeux/meshoptimizer), [KTX Software](https://github.com/KhronosGroup/KTX-Software), [Basis Universal](https://github.com/BinomialLLC/basis_universal): optimization and texture compression candidates with validated quality/budget comparisons and license review.
- [OpenUSD](https://openusd.org/), [MaterialX](https://github.com/AcademySoftwareFoundation/MaterialX), [OpenPBR](https://github.com/AcademySoftwareFoundation/OpenPBR): higher-level layered scene/material exchange where both endpoints genuinely support it; **USD not a magic lossless Unity/Unreal/Three.js converter**.
- [Blender](https://www.blender.org/): immediate flexible open-source asset authoring foundation and Python automation. Code operating through bpy may carry GPL obligations when distributed as an add-on; legal review per add-on is required.
- [Poly Haven](https://polyhaven.com/license) and [ambientCG](https://docs.ambientcg.com/license/): CC0 photo/PBR/HDRI sources. Include attribution/provenance and exact asset hashes in source manifest. Don't bulk download; prefer approved small high-fidelity hero assets.

**Pipeline**: references+license → concept geometry multi-view → native Blender/other authoring → topology/UV/normal/PBR/rig tests → export GLB/USD with manifest + digest → native engine import by its API → visual QA vs reference across angles and animations → resource/mobile budgets → approved commit.

## AI-native reliability and user experience

Competitive patterns:
- **Direct selection**: click an object and let agent read stable object/instance ID + transform, not guess where it is.
- **One accepted change**: plan → preview → capture actual frame → check native source and art → undo/commit; avoid agent doing 100 unreviewable operations.
- **Seeded playtest**: deterministic input/frame, physics, camera and timing; comparable screenshots under the **same GPU backend**.
- **Review separation**: builder proposes, independent visual QA rejects/passes; exact referenced art has authority.
- **Memory and cost**: retain reproducible failures and lessons per project revision; cache only validated findings; respect VRAM/RAM, provider limits, worker leases and egress boundaries.
- **Agent neutrality**: use typed common commands with any authorized local or BYOK AI provider; no vendor-specific reasoning API required.
- **User workflow**: one universal project picker, detected native engine, tasks+quality gates, visible real preview, source diff, run tests, export; don't create a second IDE if editor already handles it well.

## Visual QA and security research

- [RenderDoc](https://renderdoc.org/docs/getting_started/features.html): real graphics frame introspection, particularly native D3D/Vulkan; browser ANGLE interception must be tested, not assumed.
- [Spector.js](https://github.com/BabylonJS/Spector.js): WebGL call inspector for draw/shader analysis; may impose overhead.
- [WebGPU Inspector](https://github.com/brendan-duncan/webgpu_inspector): browser WebGPU debugging if/when tested; WebGL and WebGPU are distinct paths.
- [SSIM.js](https://github.com/obartra/ssim), pixelmatch and other image comparators are useful *regression tools*, **not proof of photorealism**; false matches can occur under luminance or small-object changes.
- **Threat model**: recent Godot/Unity MCP discussions show raw `execute_code` or `editor.run_script` endpoints are high-impact. A loopback port is not equivalent to authentication. Never clone an untrusted repository and run its installer without source inspection.
- Gate operations by exact project root, signed/verified adapter source, typed narrow capabilities, intended effect, fresh grant, timeout, rollback and independent evidence. Require capability negotiation: an adapter may support read and capture but not mutation.

## Competitive gaps that are worth solving *before more features*

1. **Cross-engine project identity and capability discovery**: most agent studios are tied to one editor/provider; ours can unify user workflows without forcing a conversion. Implemented first contract in `studio/universal-core.mjs` (**not yet a working native adapter**).
2. **Native source persistence**: preview edits MUST be reflected in committed game source and survive restart, with strict engine-native ID handling; currently unproven cross-engine.
3. **Independent visual authority**: distinguish RGB capture, native GPU, object ID where supported, and actual art-reference acceptance; no fabricated view quality.
4. **Interoperable asset provenance**: per-asset license, hashes, real exporter, rigs, transform, PBR consistency, compression and engine-specific import receipts.
5. **Hardware-aware work routing**: on 16GB RAM/GTX1060, limit simultaneous GPU and source-model jobs; defer huge Unreal/O3DE workers.
6. **Minimal operator involvement**: exceptions only for spending, permissions, irreversible changes, publishing and genuinely unknown art preferences.

## Explicit architecture refusals

- Do **not** write a new renderer/game engine as the initial goal; we'd duplicate mature engine internals before value.
- Do **not** adopt React Three Fiber as the universal runtime. It would make Unity/Unreal users convert projects.
- Do **not** auto-install thousands of addons or bundle big game assets, model weights, cloud keys, commercial engine executables or artist-licensed data.
- Do **not** call source-available PolyForm code open-source MIT.
- Do **not** claim competitor benchmark gains from vendor self-reported tests.
- Do **not** copy whole third-party repositories or GPL-linked code into proprietary packages without review.

## Recommended decision

Prioritize the **engine-agnostic control contract**, an actual read-only adapter for the existing LiveWorld Forge fixture, then a native proof through Godot and Unity isolated demos. Study Unreal Editor plugin feasibility after hardware/resource admission. Build the rest as portable modules (asset factory, screenshot QA, terrain tools, project automation). That delivers verifiable universality and preserves existing game investments.

**Status**: Research sources reviewed and scored; source code in this repo is original. No upstream code downloaded or installed by this report. All engine integrations remain RESEARCH_ONLY until independent acceptance receipts exist.
