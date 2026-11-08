# NGDS — MiniMax Vision P1: In-Game Observation Pilot
Date: 2026-11-08
Status: HANDOFF PREPARED; NO LIVE MINIMAX MODEL / GPU PILOT EXECUTED
Project: Nomadic Game Development Studio (NGDS). Fixture-only; NOT active STILLWATER.

## Confirmed environment at read-only inspection
- MiniMax Code desktop installed and running; executable: C:\MiniMaxCode\MiniMax Code\MiniMax Code.exe; version 3.1.12.215.
- The inspected MiniMax MCP registry had only a worker-mesh entry. This does NOT rule out built-in image tools or direct image attachments. Actual session vision-input delivery is UNVERIFIED.
- MiniMax official sources confirm M3.1 Flash image/video input, and MiniMax Code documentation explains local image attachments and its optional vision MCP.
- Source: C:\NomadicLabs\NomadicGameStudio-PublicCandidate-20261108
- Current NGDS P0 engine-neutral contract, isolated spectator camera and capture/undo fixture passing tests. A MiniMax visual triage contract and 17 negative/positive unit tests have passed under resource admission; this does not prove MiniMax was actually invoked or understood an image.
- Active STILLWATER repo: C:\NomadicLabs\AlaskaRetreatWeb, branch work/living-alaska-20261103, observed HEAD 2ad6260c02b69ddc777da6c1e62e0df6fd8b11e2, tracked dirty visual sources. Reinspect before any action; PRESERVE ALL edits and history.

## Owner's primary purpose
Make MiniMax inspect the *real pixels from inside a running game* while also seeing object IDs and source context, move the spectator camera, compare viewpoints, diagnose visible graphics flaws and eventually make a reversible fix. No replacement of Unity, Unreal, Godot or Three.js: the studio uses engine-specific adapters under a shared protocol. This is an instrumented agent observation loop, not a claim of literal AI consciousness.

## P1 Gate A — MiniMax image-input proof (lowest cost; no GPU work)
1. At a safe checkpoint, verify the current selected MiniMax model and actual supported image input path in the installed app. Do not assume vision based on marketing.
2. Use one synthetic public LiveWorld Forge screenshot via an official image-attachment or MiniMax_understand_image tool. This screenshot may be sent to the user's existing MiniMax service; never send private game images without an authorized scope.
3. Require an image-grounded answer and a negative question the pixels cannot answer. Record actual image SHA, model/tool name, response, any errors, whether image data was delivered and any costs.
4. If no real image tool is available, classify BLOCKED_MODEL_IMAGE_PATH. Do NOT install plugins, CLI or modify existing provider profiles merely to bypass it.

## P1 Gate B — real native renderer capture (requires independent resource lease)
1. Obtain HEAVY_GPU Resource Admission when MiniMax is not using the GPU; never launch a competing test process while she works on STILLWATER.
2. Start a disposable copy of the bundled LiveWorld Forge with a temporary state directory, isolated Edge profile, localhost-only server and confidential session token. NEVER use user's normal browser profile.
3. Lock viewport, pixel dimensions, camera, scene revision, time, source/assets and native GPU backend. Verify actual GTX 1060 hardware rendering, not SwiftShader unless testing software fallback separately.
4. Obtain RGB frame via independently qualified capture process and record process/GPU provenance plus SHA. Existing LiveWorld Forge client-submitted screenshots are NOT automatically native trusted evidence. Reject stale/mismatched captures.

## P1 Gate C — the first actual in-world MiniMax vision loop
1. Inspect the fixture's real scene, original camera and object IDs with studio/presence-core.mjs and studio/adapters/liveworld-presence.mjs.
2. Under fixture-scoped permission, move spectator camera to three controlled views. Capture, pass image bytes AND object IDs to the tested MiniMax vision input; then undo and verify exact original camera.
3. Plant one known visible defect in an isolated fixture (floating model, reversed normals or missing texture). Maintain a hidden independent answer key. Ask MiniMax to identify object, location, defect and evidence, using studio/vision/minimax-review-contract.mjs for a source/frame-bound report.
4. Do not count guesses, hallucinated IDs, unrelated images or hash-only observations as vision success. Require actual model visual evidence and independent pixel inspection. User sees NO screenshots.

## Next phase (not P1)
Only after model observation works: one bounded, reversible art fix to disposable game source, real native GPU before/after captures, independent review, then source restore/commit. Later run blinded control-vs-world-presence throughput benchmark specified in docs/THROUGHPUT_EXPERIMENT_PROTOCOL.md. Record user interventions, GPU/model cost, time to accepted visual improvement and regression rates.

## Hard prohibitions
- NO edits to STILLWATER, other live games, working MiniMax sessions or game saves.
- NO changes to engine, provider, paid services or worker grants without separate approval.
- NO fake native GPU claims, no uploading private game imagery to unapproved providers, no visual spoilers to owner.
- NO arbitrary editor script execution or broad MCP tool authority; keep typed methods and scoped grants.
- P1 success is NOT proof that graphics quality or development throughput improved.

## Required next worker report
Actual chosen MiniMax model + verified vision method; image evidence; source and native capture identity; GPU/worker lease; three-view and planted-defect result; specific gate PASSED/BLOCKED; next bounded action. No extra game systems or generic project roadmap.
