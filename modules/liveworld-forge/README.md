# Nomadic LiveWorld Forge — isolated prototype

**Status: working prototype in qualification, NOT a completed AI-autonomous game studio and NOT production-integrated.**

This is the next model-neutral layer atop our EXISTING Nomadic Scene Forge and Sightline research. It serves an actual interactive Three.js r148 scene with the local Scene Forge-generated cabin GLB and exposes a typed REST contract for authorized AI or human editors.

## Verified features to assess
- Locally rendered Three.js scene; offline static vendor and GLB assets.
- Agent-independent JSON commands: add (box/sphere/cone/cylinder), transform, recolor, remove, camera, undo.
- Revision conflict protection and atomic saved-scene snapshots.
- Server-sent events (SSE) for live updates after API edits.
- Browser canvas capture submitted locally, saved with SHA-256 and explicit CLIENT_SUBMITTED_NOT_INDEPENDENTLY_VERIFIED status.
- Strict loopback bind, editor token required for changes, cross-origin write rejection, typed bounded input; no arbitrary model code or shell execution.
- No subscriptions or external network requirements.

## Start and use (Node 20+; use installed local Node v26)
Run from C:\NomadicLabs\NomadicLiveWorldForge-Pilot on Windows:

    $env:LWF_TOKEN = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    & 'C:\NomadicLabs\runtime\node-v26.4.0-win-x64\node.exe' server.mjs

Open http://127.0.0.1:18788/ in an isolated browser tab, paste the same LWF_TOKEN into the editor password field for editing. The token is only held in the local process environment and the open page memory; it is never stored by the app.

From another local PowerShell session, supply the SAME editor token from your own authorized shell/session and run:

    node agent-cli.mjs inspect
    node agent-cli.mjs contract
    node agent-cli.mjs edit examples/add-prop.json
    node agent-cli.mjs capture-meta

An AI agent may issue exactly the same commands from its own authorized terminal. Inspect is read-only and requires no secret; mutations require LWF_TOKEN, which must be supplied via approved environment/secret storage. Do not send the secret in prompts or logs.

## Safety
This is a separate directory. It never edits C:\NomadicLabs\AlaskaRetreatWeb, the active MiniMax checkout, Source Forge, Sightline checkpoint, Covert Engine or another worker's repo. Do not connect it to a production repo, native shell/Blender execution or Mod SDK without resource, authorization and security qualification. Run browser/GPU experiments under normal Resource Admission.

## Tested and untested
The lightweight Node API suite is tests/scene-contract.test.mjs; tests/browser-smoke.mjs uses actual Edge headless and a disposable browser profile, and only becomes accepted after a real admission grant plus result receipt. Headless software rendering is not native GTX1060 performance acceptance. The capture endpoint is browser-submitted evidence, not an independently certified Sightline visual comparison.

## Next engineering phases
1. Qualify actual Edge scene rendering and dynamic edit with a real screenshot, restore/undo, and engine-native timing receipts.
2. Add constrained scene graph hierarchy, picking/selection, working collision components, and GLB import with verified LOD/UV/PBR/animation from Scene Forge.
3. Integrate existing Sightline v7.1 capture/compare and fixed-camera source-bound before/after QA.
4. Provide engine adapters for Godot and Unity without replacing their renderers.
5. Build safe Blender typed editing plus Blender live viewport and optional AI design agent, preserving worker ownership and Resource Admission.
6. Add provider-independent character reference identities and motion/video generation adapters (see docs/FLOW_REFERENCE_CONTINUITY.md); this is optional, not a subscription dependency.
7. Package with redistributable third-party licenses and a safe installer after full adversarial and GPU checks for an external developer such as Cody.

## Limitations
No neural image-to-3D reconstruction, agent vision verification, physics engine, true player-in-world embodied navigation, art-director AI, multi-user collaboration, game deployment integration, custom shaders or trusted runtime screenshot attestation yet. It is a genuine local live scene editor, NOT equivalent to Google Flow, Tripo, Blender, Unity, Godot or a complete game studio.
