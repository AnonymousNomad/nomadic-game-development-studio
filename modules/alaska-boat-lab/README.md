# Alaska Offshore — Shrimp Boat Visual Benchmark

**Project classification:** Original, isolated NGDS graphics fixture. Version 0.1.0 — prototype, not qualified photographic realism, not a game release.

This is a playable scene you can walk around visually with the **camera**, not a full boat-operation game. It was created for a hands-on evaluation of atmosphere, vessel geometry, sea movement, cinematography, render performance and future source-grounded AI graphics critique. The visual target comes from three screenshots supplied privately by the owner from Cody's Facebook reference. We do not redistribute those screenshots.

## Start it on the authorized Windows laptop

Double click `START_BOAT_LAB.cmd` in this directory, or run `node server.mjs` with a locally installed Node 20+ and open `http://127.0.0.1:4177/`. No npm install, account, internet, AI model, paid asset or dependency fetch is required. All Three.js code loads from the studio's existing bundled `../world-studio/three.min.js`.

## Hands-on features

- A procedural **23-meter steel commercial workboat**, lofted displacement hull, raised wheelhouse, detailed glazing, railing/bulwarks, exhaust, radar, mast rigging, two shrimp-net outriggers, hydraulic winches, trap frames, aft equipment, running and deck lights.
- Multilayer 3D displacement ocean with animated moon highlights, subtle wake and foam.
- Rugged procedural shorelines and an independently shaded sky with moving clouds and a moonlit break.
- Sea state (1–5), Moonlight, Vessel inertia (heavy/medium/light), weather clarity, pause, camera views (chase/orbit/bridge), drag-to-orbit, scroll-to-zoom, PNG capture, and a **12-second automatic camera tour video recorder**. On supported Edge versions it downloads MP4; otherwise WebM. Recording runs locally, without uploading media.
- Read-only observer API: `window.__NGDS_BOAT_LAB__.inspect()` reports scene, camera, objects, backend label and client-side frame times. This is **client telemetry, not signed evidence**.

## Graphics acceptance checklist

1. Hull must read as a commercial fishing vessel, not a simplified yacht; inspect from stern, beam and bow.
2. Moonlit water should show wave roughness, glints and a plausible horizon without a flat tiling appearance.
3. Boat weight should feel convincing at sea state 3; use Vessel Inertia to expose the contrast.
4. Cabin must remain readable at cinematic exposure; assess relative to the owner's dark reference shots.
5. Sea, coastline and boat must remain responsive at appropriate hardware frame budgets (GTX 1060 target 30 fps at practical resolution, **measured GPU performance pending**).
6. Make corrections only after examining actual browser pixels; screenshot identity and camera/time state must be recorded for comparisons.
7. Preserve this test separately from `C:\NomadicLabs\AlaskaRetreatWeb` (STILLWATER), Cipher and game-production projects.

## Shareable demonstration

The **RECORD 12s CINEMATIC TOUR** button records the actual canvas output and downloads a video (MP4 if the browser exposes an H.264 MediaRecorder codec; otherwise WebM). This is an experimental proof-of-capability, not a final production trailer. Video compression/performance depends on the user's browser and hardware. Review the graphics before sending it to anyone.

## What this first version is NOT

Not a fully simulated shrimp boat or licensed reconstruction of the reference artist's boat; not an ocean-fluid solver, hydrodynamic stability model, raytraced reflection system, procedural photogrammetry, or an integrated MiniMax reasoning adapter. The CSS HUD and Three.js scene are original. The reference video was not downloaded or bundled. This is the controllable benchmark for visual iteration and future NGDS model-vs-human review experiments.

## Validation

Run `node --test tests/*.test.mjs` and `node --check app.js`. A successful static/HTTP test is **not** visual approval; browser GPU capture, shader logs and actual render inspection remain separately required.
