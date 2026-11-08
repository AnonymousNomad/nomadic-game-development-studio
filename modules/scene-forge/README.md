# Nomadic Scene Forge — owned offline asset pipeline (v0.1)

**Status: EXECUTABLE PROTOTYPE / NOT GAME-PRODUCTION QUALIFIED.**

A subscription-free, locally runnable 3D authoring foundation written for Nomadic Labs. It includes **our own** Python-stdlib MCP server, deterministic GLB exporter, typed A-frame authoring, local PNG heightmap-to-terrain meshing, named object IDs, provenance manifests, and optional local Blender conversion to `.blend`. There is **no Tripo/Meshy/cloud API or subscription dependency** and no third-party source code is embedded in this package.

**Important distinction:** An ordinary photograph is not a depth map. This version **does not** reconstruct an arbitrary photo into a complete faithful 3D scene. Its cabin is constructed from a typed blueprint (which an existing coding agent can author from reference images); its terrain generator converts an *8-bit heightmap* whose pixels encode elevations. The next research stage is a separately qualified, self-hosted object-reconstruction model under a permissive license. Do not claim image-to-3D AI is implemented.

## What actually works

- Python 3.10+ / Python standard library only for construction and MCP protocol.
- `scene_forge.py` checks typed input, builds an A-frame with roof, doorway, glazed front, walls, deck, railing, and step. Material PBR factors included; geometry is **blockout-to-midpoly**, not photoreal.
- `terrain_forge.py` reads bounded 8-bit PNG grayscale/RGB/RGBA heightmaps with the PNG standard filters, creates height-field triangles in meters, and exports standard binary glTF (`.glb`). Unsupported PNG formats fail explicitly.
- Both commands save `*.manifest.json` containing SHA-256 evidence and `production_qualified=false`.
- `mcp_server.py` uses JSON-RPC MCP over standard input/output with five tools: `nsf_plan_aframe`, `nsf_build_aframe`, `nsf_build_terrain`, `nsf_blender_stage_blend`, and `nsf_inspect_glb`.
- Writing tools default to **disabled**; only configured output directories are writable; output files are never overwritten.
- `blender_bridge.py` / `blender_batch.py` implement a fixed local `GLB -> .blend` conversion without model-supplied Python execution. This adapter is **IMPLEMENTED BUT NOT LIVE-BLENDER TESTED**.
- No image, asset, MCP tool, or webpage content can dictate an arbitrary shell command.

## Try it without an AI model (safe, no Blender required)

From the extracted folder:

```powershell
py -3.10 scene_forge.py plan --spec examples/aframe.json
New-Item -ItemType Directory -Force -Path scratch | Out-Null
py -3.10 scene_forge.py build --spec examples/aframe.json --out scratch
py -3.10 scene_forge.py inspect --glb scratch/alaska_aframe_v0.glb
py -3.10 -m unittest discover -s tests -v
```

Open `scratch/alaska_aframe_v0.glb` in **local Blender** (File > Import > glTF 2.0) or in a local Three.js glTF loader for visual inspection. This is **not** authorization to import it into STILLWATER's accepted scene.

## Use a local elevation image

A synthetic `examples/synthetic_heightmap.png` is included solely to exercise the heightmap pipeline. It is NOT survey data and must never be represented as a real Alaskan DEM.

```powershell
py -3.10 terrain_forge.py --name synthetic_valley --input synthetic_heightmap.png --reference-root examples --out scratch --samples 33 --size-m 220 --relief-m 65
py -3.10 scene_forge.py inspect --glb scratch/synthetic_valley.glb
```

For real DEM tiles, import a *properly licensed and georeferenced source*, perform datum/unit conversion and sampling outside this v0 importer, and preserve attribution and transforms. This importer does not read GeoTIFF or 16-bit DEM itself.

## MCP configuration (example ONLY; no live app changed)

Use absolute paths matching where you extracted the ZIP. Start **read-only** by omitting both permissions flags:

```json
{
  "mcpServers": {
    "nomadic-scene-forge": {
      "command": "py",
      "args": ["-3.10", "C:\\NomadicLabs\\NomadicSceneForge\\mcp_server.py"],
      "env": {
        "NSF_OUTPUT_ROOT": "C:\\NomadicLabs\\NomadicSceneForge\\scratch",
        "NSF_REFERENCE_ROOT": "C:\\NomadicLabs\\NomadicSceneForge\\examples"
      }
    }
  }
}
```

For an **independently authorized, resource-admitted isolated pilot**, the host operator may set `NSF_ALLOW_WRITES=1` for deterministic GLB writes. `NSF_ALLOW_BLENDER=1`, plus `NSF_BLENDER_EXE` set to a verified local Blender executable, enables the optional Blender conversion. The flags are feature switches, **not** a substitute for the Worker's own Authority and Resource Admission; the production host must enforce those boundaries around every mutation and Blender job. Do not enable them in an untrusted MCP client.

## What needs to be built before production use

1. Read-only connection of this server to MiniMax's existing session and exact game-studio worker lane; then an admitted isolated reference-image pilot outside the game.
2. A permissively licensed, locally stored image-to-object model (TripoSR is a candidate), pinned model weights/dependencies and hardware-envelope proof. **No download, model install, or inference test performed.** Its default runtime uses approximately 6 GB VRAM per the upstream README, so this GTX 1060 6 GB may not fit while rendering the desktop.
3. Optional Blender adapter tests in the **actual installed Blender**, plus normals/UVs/texture baking/LOD/collision/silhouette and visual comparison checks.
4. Reference image → explicit geometric blueprint extraction and a **multi-view** design/validation loop. Geometry unseen in a single image cannot be verified from that image alone.
5. Import into Three.js / Unity / Godot separately, with physically correct scale, materials, collisions, interactive testing, and **Sightline native render** comparison to the user-approved reference; preserve the no-preview-to-owner rule.
6. Durable transaction handling, atomic staged installation, recovery, trusted asset licenses, and operator-authorized release packaging. This code alone is not a studio release.

## File structure

- `scene_forge.py`: own glTF 2.0 GLB encoder, parameterized cabin builder and manifest.
- `terrain_forge.py`: own 8-bit PNG decoder and heightmap-to-GLB builder.
- `mcp_server.py`: own restricted MCP server, no HTTP server / arbitrary Python.
- `blender_bridge.py`, `blender_batch.py`: optional controlled Blender import.
- `examples/`: scene blueprint and synthetic elevation image.
- `demo-output/`: generated test assets, **not visually accepted art**.
- `tests/`: regression and negative controls.
- `docs/`: research/licensing, architecture and acceptance gates.

**License:** MIT for these newly written files (see `LICENSE`). The license does not apply to Blender, TripoSR or any potential separately fetched model; their original licenses remain in force if adopted.
