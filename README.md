# Nomadic Game Development Studio

**Early public testing preview — built by Nomadic Labs primarily for the author and friends Barry and Cody.**

An experimental, local-first toolkit for working with 3D game scenes, agents, meshes and visual verification. This repository contains **real source code and tests**, not a finished engine, commercial editor, or AI model.

## Three standalone working modules

| Module | What it does | Status |
| --- | --- | --- |
| [World Studio](modules/world-studio) | Synthetic Three.js world, local MCP agent bridge, controlled edits, undo and canvas capture | Source/protocol test pilot; **not native-GPU or real-game qualified** |
| [LiveWorld Forge](modules/liveworld-forge) | Local live editor, imported GLB, typed agent commands, persistence/revisions, undo and CLI/MCP | Independent real browser and contract qualification; **not production-integrated** |
| [Scene Forge](modules/scene-forge) | Python stdlib A-frame and terrain GLB exporters, Blender bridge foundation | Source and GLB export tests; **not photoreal asset creation** |

The tools are separate, not yet a unified product. Nothing here operates on STILLWATER, any other game project, or your AI subscription accounts.

## Try it on Windows

Requirements: **Node.js 20+**, a modern desktop browser, and **Python 3.10+** for Scene Forge. No service sign-in, model weights or paid generation credits are bundled.

Download from GitHub (Code > Download ZIP), extract it, and open a PowerShell terminal in the extracted directory:

**World Studio protocol tests:** cd modules/world-studio; node --test protocol.test.mjs server.test.mjs mcp.test.mjs

**LiveWorld Forge contract tests:** cd modules/liveworld-forge; node --test tests/scene-contract.test.mjs tests/mcp-stdio.test.mjs

**Scene Forge tests:** cd modules/scene-forge; py -3 -m unittest discover -s tests -v

Return to the root directory between commands. To run a **local demo**, start the particular module's server by following its README. The two browser modules are separate and should not be launched simultaneously unless their loopback ports are verified distinct. Keep access on the same machine, never expose or forward ports.

## What is not included

No fully autonomous game generation, Blender/Unity/Godot installation, live integration with a game, video generation, Google Flow control, published Cipher plugin, developer secret, private game assets, personal files, or downloaded AI models. The broader Sightline toolkit is **not** bundled: its release and plugin security qualification are separate. See [TESTING_AND_LIMITATIONS.md](TESTING_AND_LIMITATIONS.md).

## Feedback welcome

Barry and Cody: please share operating system, Node/Python version, exact command, expected/actual outcome and reproducible error. Do **not** share bearer tokens or private media in bug reports.

## Ownership and licensing

Scene Forge and the included Three.js library retain their MIT licenses. Other original code is public for inspection and evaluation, but no general open-source/reuse license has yet been selected. See [RIGHTS_AND_PROVENANCE.md](RIGHTS_AND_PROVENANCE.md). This preview should not be represented as a certified or security-hardened production release.
