# NGDS-002 — AI World Presence: the agent inside the game
Date: 2026-11-08
Requirement: ACCEPTED PRODUCT DIRECTION. Implementation: P0 isolated fixture only. Native GPU/real model vision: NOT VERIFIED.

## Intent
The AI must be able to experience an in-progress game from within its own running world. It should have a spectator camera (free movement, look, focus, orbit, inspect), a disposable player mode (input, physics, UI, navigation), actual rendered images, structured object and GPU state, and a reversible propose-edit-observe loop. The artist does not have to shuttle screenshots and manually diagnose primitive art. Keep the same AI tools across Three.js, Unity, Unreal, Godot and other engines through qualified native adapters. Do not make every engine run as a browser app.

This does not mean models literally live or possess consciousness inside the game. It means real tool-driven visual/simulation experience, with frame-grounded decisions and independently verified results. Use bounded event-driven observation instead of endless GPU-intensive video stream.

## Previous work — the basic concept already exists
- PlayCanvas Stage (MIT): https://github.com/playcanvas/stage — an AI and a human share a PlayCanvas camera, clicked object ID, live preview and source edits; requires compatible PlayCanvas engine.
- Paprika3D (Apache-2.0): https://github.com/paprika3d/paprika3d — claims frame-accurate Three.js input, browser captures, visibility diagnosis, render QA and reference comparison. Published benchmark benefits are author-reported, not reproduced by us.
- Godot MCP: https://github.com/satelliteoflove/godot-mcp — game time control, input injection, live structured node state and real screenshot inspection.
- Vollkorn Godot MCP: https://github.com/Vollkorn-Games/godot-mcp — bundled game control inputs, state and screenshots, but broad editor eval requires security review.
- Unity Game View official: https://docs.unity.com/en-us/engine/6000.6/manual/unity-editor/editor-windows-views-reference/game-view — editor camera and Play/Pause/Step. Community Unity MCP capture tools exist at https://github.com/burakaydinofficial/unity-editor-mcp .
- Unreal Editor Python/native Level Viewport/PIE are different integration surfaces; no confirmed adapter or resource qualification on the user's machine.

Our edge is not inventing the idea of AI screenshots. It is a secure, engine-neutral, visually verified source-change loop proven to reduce game-building friction across engines.

## Three observation channels
1. SPECTATOR: camera in isolated editor/game world, no physical player, object selection, fly, orbit, focus, viewpoints; treat moving saved camera as a mutation if the engine persists it.
2. PLAYER: disposable test save, real game input, physics, collisions, animation, UI, sound and time; never write user's primary save.
3. EVIDENCE: independently sourced screenshot pixels, exact camera/scene and source revision, GPU backend/driver, structured objects/errors, time/weather, image hash and a reviewer that compares to approved art. The camera preview alone cannot test gameplay and a client-supplied PNG alone cannot prove native GPU rendering.

## Current implementation P0
- studio/presence-core.mjs: validates scene/camera/revision and PNG bytes, allows bounded spectator goals behind an injected approval gate, supports reversible navigation and returns image Buffer only on explicit internal request.
- studio/adapters/liveworld-presence.mjs: constrained loopback-only bridge to the bundled LiveWorld Forge fixture. Uses exact-revision camera writes/undo, reads frame bytes + metadata, refuses remote URLs, secrets not in logs.
- studio/tests/presence.test.mjs: integration with a REAL temporary local HTTP LiveWorld Forge server, test scene persisted separately under OS temp, camera navigation+undo, stale screenshot refusals, hash and image byte handoff, safety negatives.
- All captures from the fixture remain marked UNVERIFIED_CLIENT_CAPTURE, not NATIVE_GPU. A forged JSON native-GPU attestation is rejected. No actual vision AI model or engine process launched in P0.
- The approvalCheck callback in tests is a deliberately minimal fixture stand-in, NOT a production security grant. Actual Authority/Resource Admission required in host.

## Real build/test phase gates
P1: Under fresh HEAVY_GPU resource admission and no MiniMax worker contention, launch ISOLATED LiveWorld Forge Edge (native GTX1060 ANGLE verified; no SwiftShader substitution), bind independent capture to actual GPU output, steer view to 3 objects and viewpoints, return source-bound images+object state, restore camera, test leaks/crashes. Feed frames to ONE authorized vision model with a planted graphics defect and objective oracle. No screenshot to owner. Pass only if native renderer + camera + actual vision diagnosis + restore are all demonstrated.

P2: Only then qualify read-only attachment to one existing Three.js app; separate native Godot and Unity test-project adapters with editor/player camera. Unreal is an explicit later adapter based on native Editor Python/PIE and measured hardware feasibility. Never modify STILLWATER or other live game until its owner and MiniMax worker approve project-specific access.

P3: Full loop observe real frame → identify visible/missing object and cause → propose one native patch → guarded source transaction → rebuild/playtest → independent matched-camera visual review across near/mid/far and motion → approve or roll back. Re-verify visual quality against photo/concept references, p50/p90/p99 frame time, RAM/VRAM and real game behavior. Not a brightness-score shortcut.

P4: Integrate GUI, context/camera selection, bounded autonomous exploration, model/cost routing, event-based visual alerts and engine-capability badges. Only claim operational engine compatibility after that engine's own receipt.

## Failure modes
- A forged client PNG cannot become trusted by being hashed or self-attested.
- Render frame sequence, clock, source, camera, backend and viewport must all match; reject old screenshots, title screens, false native GPU labels and synthetic evidence presented as real.
- Camera editing, editor object manipulation and avatar input have different authority effects.
- Model visual diagnosis may be wrong; use grounded references and independent failure injection.
- Continuous vision competes with 16GB RAM/6GB GTX1060; cap frequency, image sizes and token/paid-provider egress. No silent cloud upload.
- No raw JS/Python/C# eval exposed through generic browser tool endpoints; plugin code and imported assets are untrusted until vetted.
- Preserve the user's no-game-preview surprise preference; internal pixel review only.
- Licensing and third-party code import require individual source and redistribution review.

## Competitive benchmark requirement
See THROUGHPUT_EXPERIMENT_PROTOCOL.md. Our hypothesis is that image-grounded observation reduces repeated agent cycles, user interventions, and time-to-accepted-visual-fix, while holding quality, cost and resource budget constant. This is NOT a measured benefit yet.

Status: P0 fixture written/tested; P1 GPU vision BLOCKED/PENDING; real AI agent world experience NOT IMPLEMENTED; throughput effect NOT MEASURED.
