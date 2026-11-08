# Nomadic Scene Forge v0.1 — test receipt

- Checked: 2026-11-06 (UTC release-check within this conversation)
- Scope: isolated Linux sandbox; **not** a Windows/MiniMax integration test
- Python: 3.x, standard library implementation
- Command: `python -m unittest discover -s tests -v`
- Outcome: **21 tests, 21 passed, 0 failed**, approximately 4.7 seconds
- Negative controls: invalid schema/dimensions, traversal, invalid/oversized/short PNG, incorrect GLB header, refused writes, refused Blender execution, no overwrite
- Independent GLB parser: `trimesh` loaded both exported demonstration files; nonzero geometry and matching artifact hashes
- Geometry checks: 79 separately named cabin scene nodes, 1 triangulated terrain node
- Did not run Blender executable, native game engine, VRAM benchmark, model inference, Sightline, or human visual acceptance
- No live workstation project or MCP configuration modified during prototype creation
- **Release status: PROTOTYPE BUILT AND TESTED; NOT PRODUCTION QUALIFIED**
