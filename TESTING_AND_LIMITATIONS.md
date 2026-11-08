# Evidence and limitations

**Historically reported tests, not a certified universal production release.**

- World Studio protocol/MCP checks: 13 tests pass.
- LiveWorld Forge contract/MCP checks: 10 tests pass.
- Scene Forge: 20 tests pass, 1 optional independent trimesh-parser test skipped (not installed).
- Universal Core: 21 pure source-level tests pass; no native engine adapter connected.
- World Presence: 14 fixture tests pass, including temporary authenticated loopback HTTP camera movement/undo, scene-revision-bound client PNG evidence, and false provenance rejection.
- MiniMax Vision triage contract: 17 tests passed, including stale frames, fabricated object IDs, scene revisions, malformed bounding boxes and model self-acceptance refusals.
- **Current grand total on 2026-11-08: 95 pass, 0 fail, 1 skipped** under Resource Admission LIGHT. See docs/WORLD_PRESENCE_P0_TEST_RECEIPT_20261108.md for the earlier P0 baseline and docs/MINIMAX_VISION_CONTRACT_TEST_RECEIPT_20261108.md for the new gate.

These are source/fixture functional tests. **No native GPU, real MiniMax model visual input, independently reviewed graphics fix, production game engine adapter, or development throughput improvement was verified in this release.**

## Separate projects and what was deliberately omitted
- Sightline: separately developed visual QA tooling, not installed in this public preview.
- STILLWATER and all other games: excluded; no private game assets, saves, model weights, screenshots or scripts.
- AI Three.js Studio, Pascal Editor, Three.js DevTools MCP: third-party research projects, not copied as dependencies; consult their original repositories and licensing.
- Browser Graphics Qualification Lab and Covert Creation Studio: independent tools not bundled here.

## Safety
These demos assume local trusted users and disposable fixtures. Never expose ports, grant all filesystem permissions, paste session tokens into GitHub issues or connect to private projects without independent qualification and backups. A self-reported screenshot is not a GPU-attested render. The studio's core only recommends operations; it does not grant Authority or Resource Admission.
