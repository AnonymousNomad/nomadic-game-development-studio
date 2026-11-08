# MiniMax Vision Contract — P1 preparatory test receipt
Date: 2026-11-08
Status: IMPLEMENTED + SOURCE-TESTED. Real MiniMax image understanding and native GPU observation: NOT TESTED.

## Actual execution
Resource Admission tool C:\NomadicLabs\control-plane\resource-admission.mjs
Job C:\NomadicLabs\NomadicGameStudio-PublicTests-20261108.job.json
Observed STARTED (LIGHT, child PID 22504); EXIT code 0.
Suite results:
- World Studio: 13/13 passed
- LiveWorld Forge: 10/10 passed
- Scene Forge: 20 passed, one optional independent trimesh parser skipped
- Universal studio core: 21/21 passed
- Presence fixture: 14/14 passed
- MiniMax Vision review contract: 17/17 passed
TOTAL 95 PASS, 0 FAIL, 1 SKIP.

## New implementation
- studio/vision/minimax-review-contract.mjs (source code)
- studio/vision/minimax-review-contract.test.mjs (positive and adversarial tests)
- docs/MINIMAX_VISION_P1_HANDOFF_20261108.md (exact test gate to use MiniMax Code)
- Corresponding handoff mirrored outside active game at E:\NomadicLabs\WorkerHarness\handoffs\NGDS_MINIMAX_VISION_P1_HANDOFF_20261108.md

The vision contract verifies model-produced structured defect reports against an existing observation's frame hash, exact scene revision, viewport, known object IDs, bounded normalized pixel rectangles, confidence range and defect vocabulary. It allows model abstention. It explicitly refuses models that claim to approve their own work or request untrusted code execution. It returns TRIAGE_ONLY, never acceptance or execution authority.

## Known blockers, not papered over
- Installed MiniMax Code v3.1.12.215 is running, but its active selected model and actual ability to ingest a studio-captured PNG were not verified. Registered local MCP names showed only worker-mesh; builtin image inputs may still work.
- No new native GTX 1060 capture/independent attestation has been executed since this vision contract was written.
- No actual MiniMax visual critique, no validated game defect diagnosis, no integrated remote camera tool in MiniMax Code, no measured latency/throughput/graphic improvement and no working production editor adapter.
- No STILLWATER source/files/saves were modified or tested by these studio changes. GPU-heavy trials must wait for worker/resource admission.

Only after an independently captured, verified native frame and real MiniMax image response should a source edit be tested on a disposable fixture. Follow the phase gates in the handoff.
