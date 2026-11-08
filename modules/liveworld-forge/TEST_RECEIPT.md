# Nomadic LiveWorld Forge pilot — acceptance evidence

Target: local Windows NEURO-MIRROR, Node v26.4.0, real Edge v157; no hosted models, subscriptions, or API credits.

## Admitted test run 1
Resource Admission LIGHT/256, owner nomadic-liveworld-pilot, 2026-11-08.
Command: node --test tests/scene-contract.test.mjs
Result: **7/7 PASS**, exit 0; child run recorded by resource governor.
Cases include offline asset serving, read-only access, cross-origin and unauthorized write denial, revisions, typed transforms, protected asset, camera, undo, invalid input, PNG provenance, persisted state.

## Admitted browser run
Resource Admission LIGHT/1024, owner nomadic-liveworld-pilot, 2026-11-08 14:02:15Z.
Command: node tests/browser-smoke.mjs
Result: **PASS**, exit 0, real isolated Edge headless WebGL via SwiftShader, no browser JavaScript exceptions, no external models.
Initial 4 scene objects and real GLB loaded, render stats 84 draw calls / 1,012 triangles.
Applied typed agent object-add via HTTP, saw revision 1 and new object in running Edge viewport via browser CDP.
Captured 736x598 actual browser canvas PNG, SHA-256 80f95be1e6cb3da2cc05bf8401e69449e009fdab3fbb3aba4d0796e4ee5ecd0e, 70,670 bytes.
Evidence: tests/evidence/browser-smoke.json and scene-after-agent-edit.png.
Capture provenance is CLIENT_SUBMITTED_NOT_INDEPENDENTLY_VERIFIED. This is not native GPU/Sightline QA.

## Admitted test run 2 — including MCP bridge
Resource Admission LIGHT/384, owner nomadic-liveworld-pilot.
Command: node --test tests/scene-contract.test.mjs tests/mcp-stdio.test.mjs
Result: **10/10 PASS**, exit 0, with MCP initialize, tools/list, inspection, deny-by-default write, enabled typed edit, and stale revision refusal.

## Proven limits
No direct MiniMax/Google/other model call tested: model independence is at protocol level, not model-specific integration.
No native GTX1060 FPS/VRAM benchmarks, no source-bound Sightline before/after image acceptance, no arbitrary GLB interchange, no true collision/physics or avatar embodiment, no Covert/Worker Mesh production Authority integration.
No release qualification or authorization to distribute the pilot publicly.
