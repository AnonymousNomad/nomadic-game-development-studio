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

## Local setup and use (Node.js 20+)

From an extracted repository, open PowerShell in the `modules/liveworld-forge` directory. Generate a fresh random editor token and start the local server:

    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $env:LWF_TOKEN = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    node server.mjs

The default local URL is http://127.0.0.1:18788/ . Open it in a local browser and enter the token when using editor controls. Keep the server restricted to loopback; do not publish the token or port-forward the service. The application does not intentionally persist editor credentials.

From a **separate** local PowerShell session (with the same token supplied through trusted local environment configuration), run these commands from `modules/liveworld-forge`:

    node agent-cli.mjs inspect
    node agent-cli.mjs contract
    node agent-cli.mjs edit examples/add-prop.json
    node agent-cli.mjs capture-meta

Run one experimental server at a time. `inspect` and `contract` are read-only; mutations require a valid `LWF_TOKEN` and must be confined to disposable test scenes. Do not send tokens to AI prompts or include them in issue reports.

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
7. Package with redistributable third-party licenses and a safe installer after full adversarial and native-GPU qualification on a clean external development machine.

## Limitations
No neural image-to-3D reconstruction, agent vision verification, physics engine, true player-in-world embodied navigation, art-director AI, multi-user collaboration, game deployment integration, custom shaders or trusted runtime screenshot attestation yet. It is a genuine local live scene editor, NOT equivalent to Google Flow, Tripo, Blender, Unity, Godot or a complete game studio.
