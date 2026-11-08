# AI Inside-Game Presence: Throughput and Quality Experiment
Date: 2026-11-08 | PRE-REGISTERED PLAN | Actual improvement: NOT YET MEASURED

## Hypothesis
A coding agent with authorized spectator camera, live rendered frames, structured scene state and grounded visual QA will fix 3D graphics defects faster and with fewer operator interventions than an equally capable coding agent restricted to source, logs and manually prompted screenshots.

## Controlled A/B design
Control A: same model, project and editor, source-only debugging; basic manually requested screenshots allowed but no autonomous camera/visual feedback.
Treatment B: same model, project and editor, with NGDS world-presence protocol and approved camera/capture/inspect/replay methods.

Use disposable sample projects, not active STILLWATER or existing user's proprietary games. On each engine the starting project/hash, accepted art reference, defects, installed packages, editor version, GPU/driver, viewport dimensions, clock/seed, task budget and model/provider settings must be recorded. Randomize task order and crossover groups to reduce learning/order bias. Ensure agents have no access to the hidden defect answer keys or another run's feedback. Use separate fresh processes and clean runtime snapshots. An independent evaluator must review actual pixels and short motion captures without knowing the condition; structured tests cannot alone award art quality.

## Task bank (must be created BEFORE recording measured gains)
At least eight defect classes, three trials per class where practical:
1. Missing asset/texture and wrong file path — scene object exists but not visible.
2. Reversed mesh normals / negative scales — faces disappear.
3. Primitive geometry / silhouette mismatch against concept.
4. Wrong world scale or transform (including instanced mesh).
5. No PBR roughness or normal map; plastic-looking materials.
6. Shadow acne / missing contact grounding / incorrect sun camera.
7. Terrain LOD seam or impostor popping with moving camera.
8. Wrong fog/haze distance and color-space/tonemapping.
9. Water reflection artifacts or alpha-sort.
10. Native camera/clip/physics playtest regression.

Start with controlled Three.js fixture, then independent Godot and Unity test projects, finally Unreal after hardware/authority gate. Do not fake a "cross-engine benchmark" from one browser.

## Primary metrics
- Task success rate: independently ACCEPTED visual fix by reference-aware reviewer, no source corruption, no regressions.
- Time to accepted fix: from first request to accepted persistently committed source+verified gameplay render, wall-clock and active agent time separated.
- Human interventions: count *substantive* corrective prompts, not normal sign-off/approval.
- Agent repair cycles: propose → run → observe → retry; count each actual revision.
- GPU burden: native GPU p50/p90/p99 frame ms, VRAM/RAM, separate software vs hardware results.
- Cost: model tokens, subscription/API spend where measurable, CPU/GPU seconds, changed-file count and memory.
- Capture integrity: failures of stale/false renderer/provenance/camera/viewport; count rejected frames.
- Art quality: independent reference judgment, not SSIM or raw pixel histogram alone.

## Planned acceptance / product claim threshold (not results)
At least 24 paired runs at the same engine/version/model class across eight defects, independent native captures and visual judging. Additional 12 paired per Godot/Unity when available. Publish median and p90, per-category successes, confidence intervals/uncertainty, outliers and all rejected attempts.

An initial *worth pursuing* threshold: median elapsed-to-accepted improvement >=25% AND human corrective interventions reduced >=30% while accepted visual quality >=control, no more severe regressions, and average normalized total compute/provider cost not over 15% above control. These are decision thresholds, **not measured facts**. If output quality improves but speed does not, report it honestly. Don't use a single anecdote to claim gold-mine value.

## Minimal trial log schema
- trial_id, task_id, condition A/B, engine and exact version, project source SHA, asset/reference SHA
- model name/provider/version + inference profile, OS/GPU/driver/renderer/viewport, seed
- start/end UTC, wall_ms, active_agent_ms, model_input_tokens, model_output_tokens, provider_cost
- number_of_user_interventions, number_of_patches, number_of_preview_cycles, number_of_render_captures
- reviewer ID and decision (blind, independent), before/after image hashes and motion evidence hashes
- native source commit/hash, application build hash, saved scene reload and rollback checks, error/recovery
- record false captures, shader/collision failures, software rendering and unsupported devices separately

## Hard rules
- Do not claim a performance gain before all fields needed for the claim exist.
- A passing P0 presence test or binary PNG hash is **not** vision-model understanding.
- Do not sneak uncontrolled paid AI calls or internet-hosted rendering into one condition.
- Resource Admission and worker leases apply equally to A/B tests; otherwise results are confounded.
- Do not reveal STILLWATER captures to its owner or make it the benchmark fixture without explicit approval.

Status: EXPERIMENT DEFINED. Data: none. Results: NOT MEASURED. P1 native GPU and model perception remain prerequisite.
