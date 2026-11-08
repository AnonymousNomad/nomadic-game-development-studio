# Embodied AI World Presence — P0 verified fixture test receipt
Date: 2026-11-08
Classification: IMPLEMENTED + TESTED (CPU + local HTTP isolated fixture); native GPU and AI vision NOT IMPLEMENTED/NOT VERIFIED

## Actual executed test
Resource Admission call on owner laptop:
C:\NomadicLabs\runtime\node-v26.4.0-win-x64\node.exe C:\NomadicLabs\control-plane\resource-admission.mjs run C:\NomadicLabs\NomadicGameStudio-PublicTests-20261108.job.json

Observed Resource Admission: STARTED owner chatgpt, class LIGHT, child PID 18356; EXIT code 0.
- Existing World Studio protocol/MCP: 13/13 pass
- Existing LiveWorld Forge MCP/contract: 10/10 pass
- Scene Forge: 20 pass, one optional trimesh parser test skipped (not installed)
- Engine-universal core contracts: 21/21 pass
- NEW World Presence fixture (actual ephemeral loopback HTTP): 14/14 pass
TOTAL: 78 pass, 0 fail, 1 skip.

## What the new tests proved
- The local transport only accepts exact http://127.0.0.1:PORT/ and a private token; remote host, HTTPS, localhost aliases, URL path changes or short tokens are refused.
- Scene inspection obtains the actual demo's camera, object identities and scene revision without changing files.
- A camera write is refused without an injected permission/approval. Under the fixture-only test approval it updates the scene revision and persisted camera at an isolated temporary path. Undo restores exact original camera while preserving revision monotonicity.
- A complete PNG submitted to the fixture's API can be retrieved as genuine bytes and bound to reported image SHA and exact scene revision. Those bytes can be forwarded to a future model adapter.
- Stale image after camera movement is refused. Tampered bytes, wrong image revision and mismatched viewport sizes are refused.
- Forged JSON claiming a verified native GPU cannot elevate image trust. Changed image hashes are NOT claimed to imply better art.
- LiveWorld Forge server, state/history and images for tests resided in a temporary isolated folder; no live game project edited.

## Explicit NOT DONE
- No Edge renderer was launched; no real GPU or WebGL frame was captured in this test.
- No vision LLM interpreted image pixels; no autonomous player input, physics or collision testing.
- No independent GPU/process attestor, model integration, visual reference comparator or accepted graphics improvement.
- Approval callback in tests is a fixture substitute, not production Authority.
- No measurable throughput gain established; A/B protocol is separately documented and has no data yet.
- No STILLWATER/Unity/Godot/Unreal project/source changes or new workers.

## Next gate
Run a narrowly scoped native Edge GPU fixture test, with real renderer identity and independent capture, and a vision model finding a planted visible defect. Obtain a real resource lease and do not interrupt MiniMax. Then measure A/B throughput across identical quality tasks before any competitive claim.
