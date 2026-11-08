# Engine adapter certification requirements (NGDS-A1)

**Applies to every future adapter. No engine has passed this gate yet.**

## Stage A — Identity, compatibility, discovery
- Exact engine/version, project root realpath and owner, source HEAD/dirty/untracked state, native object GUID, editor installed, license and extension origin.
- Declare each supported read/preview/write/build/capture capability separately; unavailable methods stay unavailable.
- Name CPU/RAM/GPU/disk requirements. Resource Admission refusal is a STOP condition, not a reason to fake a lower estimate.

## Stage B — Security and source integrity
- Read-only introspection must not create or modify files or browser saves.
- Mutations require exact scoped permission bound to a project, operation, revision, trusted adapter hash and expiry; cross-project attempts fail.
- No open listener except scoped local loopback, no arbitrary code/command surface, no implicit internet downloads, no credential leakage in logs.
- Use engine-supported asset and Undo/transaction interfaces (Unity AssetDatabase/Undo, Unreal asset tools/scoped transactions, Godot UndoRedo). No manual renames of native asset packages.
- Crash/timeout/restart restores or cleanly records a partial transaction; no source loss.

## Stage C — Real functional evidence
- Target-native editor/game is actually opened in isolated test project under a resource lease.
- Inspect one identified scene object; change a bounded property; verify scene state AND independent pixels; undo; verify exact source and render restoration.
- Reload project; verify committed change persists with consistent native IDs and references; reject unintended imports.
- Compile/build an executable or accepted engine output with a verified artifact hash, keeping original project intact.

## Stage D — Visual and performance
- Reference-controlled before/after images: exact FOV, position, season/time, image dimensions, GPU, renderer/backend, shader inputs and sources.
- Independent reviewer looks at actual image and motion, not just pixel score or AI-written caption.
- Record p50/p90/p99 frame time, VRAM proxy or reliable native measurement, CPU and GPU telemetry where supported, memory/texture and collision budgets.
- Test representative near/mid/far scenes and a moving camera; reject temporal artifacts, impostor popping, wrong scale, and jagged foliage.
- No screenshots of private projects presented to owners who requested surprise.

## Stage E — Release
- License/SBOM/asset provenance for every shipped component. Keep proprietary engine binaries out.
- Clean machine install/uninstall, offline demo where promised, clear prerequisites and unambiguous failures.
- Publish only when authorized; mark research/prototype/tested/qualified with evidence and per-engine scope.

## Negative test matrix
Unknown engine, wrong revision, revoked grant, expired grant **at the boundary**, forged adapter certificate, unverified model output, malicious page/asset prompt injection, stale capture, title-screen mistaken for game, SwiftShader claimed as GPU, malformed GLB, missing texture/rig, source overwrite, invalid coordinate frames, disconnect between preview and commit, orphaned worker processes and GPU resource denial.

## Current status (2026-11-08)
The pure Universal Core has unit tests and **zero** native engine adapters. P1 must start with an isolated disposable fixture; it must not inherit the live STILLWATER or Nomadic Creed game authority. The independent existing Sightline tool remains a reviewer rather than a source of acceptance by assertion.
