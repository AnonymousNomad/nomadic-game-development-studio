---
name: nomadic-world-studio
description: Governed AI-assisted game-world creation, live 3D inspection, reversible edits, screenshots, asset provenance, and visual QA; currently only a synthetic Three.js fixture is qualified.
---

# Nomadic World Studio — Cipher Companion Skill

## Activation and truth
Use for requests to build, inspect, test, improve or troubleshoot game scenes and assets. The assistant proposes actions; execution is controlled by separate Cipher Authority, Resource Admission and verified Worker Mesh ownership.

CURRENT QUALIFICATION: isolated Three.js fixture and six typed MCP tools. P0 protocol/MCP tests 13/13 passed in previous checkpoint. Real Edge/GPU live editing, production-game integration, image generation, durable source transactions and distribution are NOT VERIFIED. The Studio does not give Cipher new permissions automatically.

## AI game development loop

1. Identify project/engine, current branch/HEAD, dirty state, authorized owner, renderer, camera and available approved visual references. Never infer readiness from file names or source alone.
2. Discover tools and capabilities through the actual live schema. P0 fixture tools: world_scene_state, world_set_position, world_set_color, world_set_light_intensity, world_undo, world_capture_frame. They operate only on the disposable scene nomadic-world-studio-fixture-v1, not on STILLWATER.
3. Observe current live scene state and PNG: record scene identity, revision, camera, renderer/GPU identity, object ID, world transform, material identity and image SHA.
4. Propose ONE minimal bounded edit. Never execute arbitrary JavaScript, shell, Python, URL download, direct project write or remote editor bind through these tools.
5. Observe result at the same camera/time/light, verify scene revision, object attributes and actual GPU-rendered pixels. Reject title-screen capture, software rendering, stale frame, wrong instance/world coordinate, missing material or shadow matrix updates.
6. Use independent Sightline comparison and negative controls against locked original artwork. Validate real visuals, scene scale/collision, PBR shader textures, roughness, normals, AO, materials persisted after reload, vegetation, lighting, atmosphere and native hardware frame rate.
7. If result fails, undo. If it passes, request an independently approved source-persistence transaction; RAM preview success alone never implies a saved source change.
8. Record exact output evidence, provenance, performance, accepted references, changes, rollback and final status: RESEARCHED / WRITTEN / IMPLEMENTED / TESTED / VERIFIED / BLOCKED.

## Ownership and phase gates
- STILLWATER (Three.js) source: MiniMax active. Do not change or show owner screenshots; project appearance is intended to remain a surprise.
- Frozen Nomadic Game Studio research workspace: REVIEW. Do not activate it by copying this skill.
- Nomadic Creed Unity game: established project engine and owner. No migration from Unity or new edits without authorizations.
- P0: isolated typed fixture bridge; source tests only.
- P1: admitted native GPU/Edge browser actual edit, PNG screenshot, undo and image equality.
- P2: safe real-game adapter, stable IDs/world transforms, browser identity, permissions, independent visual QC.
- P3: approved patch-to-source, asset provenance, rollback, installer safety and cross-engine support.

## Tools and legal
Three.js component carries MIT license and notice. Godot is MIT. Blender is GPL; distributed Blender Python add-ons that use bpy must follow GPL-compatible licensing. Unity requires the user's valid separate installation and license and is not bundled. Do not assume any third-party model, generator, media asset or subscription is included.

## Cipher integration boundary
This skill is written and packaged as a candidate only; not installed in production Cipher. GLM owns integration, and must use Cipher's signed marketplace catalog, operator trust, Authority, Resource Admission, isolated staging, health probe, rollback and audit receipts. This preview has no trusted signature and cannot be activated just by placing the file on disk. See CIPHER_COMPANION_INTEGRATION_DRAFT.md.

## Output standard
No false completion claims. Report which tool and engine ran, exact native renderer, what scene edit was tested, the evidence paths and whether source edits are persistent. If a gate is missing, state BLOCKED and preserve working architecture.
