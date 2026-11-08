# World Studio — isolated 3D world control pilot

Node.js 20+; no Node dependencies. This is a **synthetic, local Three.js fixture**, not an active game editor.

## Quick start

1. Run: node --test protocol.test.mjs server.test.mjs mcp.test.mjs
2. Run: node server.mjs
3. Open the **127.0.0.1** URL printed by the server in a local browser. The server prints an ephemeral agent token for the current session; keep it private.
4. Optional CLI/MCP: use ctl.mjs and mcp.mjs from a separate local terminal with STUDIO_URL and STUDIO_AGENT_TOKEN set to the exact values printed during that session.

Capabilities: read scene, change named fixture object position/color, adjust light, undo, request captured PNG. Commands are revision-bound and only target the synthetic scene. No arbitrary shell or source-writing tool is available. Edits live in browser memory and cannot be assumed to persist.

The bundled three.min.js is Three.js r148 under MIT; see LICENSE-threejs. Real GPU editing and screenshot equivalence are not established by the source-only tests.
