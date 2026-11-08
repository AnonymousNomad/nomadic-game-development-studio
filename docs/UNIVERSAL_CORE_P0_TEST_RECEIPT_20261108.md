# Universal Studio Core — P0 engineering receipt

**Date:** 2026-11-08
**Source scope:** `studio/universal-core.mjs`, `studio/cli.mjs`, `studio/research-catalog.json`, and adversarial tests
**Classification:** IMPLEMENTED + TESTED (SOURCE ONLY) / NATIVE EDITOR INTEGRATION NOT TESTED

## Exact observed test run

Command executed on authorized Windows laptop:

```powershell
node C:\NomadicLabs\control-plane\resource-admission.mjs run C:\NomadicLabs\NomadicGameStudio-PublicTests-20261108.job.json
```

Resource Admission: `STARTED`, owner `chatgpt`, class `LIGHT`, child PID `10668`; `EXIT code 0`.

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| World Studio protocol/MCP | 13 | 0 | 0 |
| LiveWorld Forge contract/MCP | 10 | 0 | 0 |
| Scene Forge Python stdlib | 20 | 0 | 1 |
| **Universal Core contract** | **21** | **0** | **0** |
| **Total** | **64** | **0** | **1** |

The skipped Scene Forge test required the independent `trimesh` package, which was not installed. Tests do not claim Blender, native browser GPU, Unity, Godot, Unreal, or standalone installer support.

## Tested contract properties

- Engine identifier is not hard-coded to any single runtime.
- Project identity binds exact revision and an absolute declared root.
- Malformed project/adapter/capability schemas are rejected.
- Scope cannot silently broaden `read` to `mutation`.
- Unknown arbitrary execution methods are not recognized.
- `RESEARCH_ONLY` adapters are not treated as operational.
- Engine mismatch, missing/forged external attestation, unsigned intent substitution, mutation without authorization, wrong-scope approval and exact expiry boundary fail closed.
- Synthetic screenshots do not satisfy native outcome receipt requirements.
- Visual acceptance receipts require source/reference hashes.
- A successful recommendation does **not** execute a tool or grant Authority.

## Explicit unresolved requirements

This is only a pure contract/API and research catalog. There is no configured native engine adapter, no cryptographic trust infrastructure or live admission call in this package, no scene renderer, no external authorization implementation, no 3D editing API bridge, and no engine-specific installation. A caller could fabricate JSON; independent Owner/Authority trust is required. This contract is **not** a security boundary by itself.

The next qualified slice is a LiveWorld Forge read/preview/commit/rollback fixture adapter, and then Godot/Unity pilot adapters. Existing game projects stay untouched. Do not claim the "universal" ambition has been completed by passing these tests.
