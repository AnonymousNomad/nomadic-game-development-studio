# Reusable Character/Reference Identity — provider-independent design

Research date: 2026-11-08. This is a PROPOSED extension, not a verified integration.

Google Flow is one example of a provider-specific reference workflow. Its documented "Ingredients to Video" functionality can combine a character reference, environment reference, and text action prompt across generations. Provider guidance recommends clean reference images and documents named-character options. These features are background research only; NGDS has no operational Google Flow adapter.

Sources:
- https://support.google.com/flow/answer/16353334
- https://support.google.com/flow/answer/16935308
- https://blog.google/innovation-and-ai/technology/ai/veo-3-1-ingredients-to-video/

Do NOT treat Flow subscriptions or credits as a studio runtime dependency. This is an interchange and process idea, not a mandated provider.

## Proposed standard asset identity record (not yet integrated)
Every character, prop, environment or shot should have a durable studio-owned ID, version, source reference hashes, permitted use/license, proportions and appearance lock, optional rig and GLB asset binding, optional voice reference with explicit consent, selected camera/lighting references, and accepted/rendered output evidence. Do not store photos of real people or voiceprints in another developer's package without their informed approval.

Example conceptual record:
{
  "schema": "nomadic.reference-identity/1",
  "asset_id": "character-demo-001",
  "identity_version": 1,
  "visual_references": [{"path":"refs/front.png","sha256":"<real SHA256>","role":"character","background":"segmented"}],
  "game_asset": {"path":"assets/character.glb","rig":"<verified rig id>"},
  "constraints": {"face":"retain reference","outfit":"retain unless specified"},
  "usage_rights": {"source":"owner-authored","license":"record before sharing"}
}
Placeholders above are NOT real files. Do not claim the record is implemented or the file exists.

## Future provider adapter contract
Input: reference identities, environment/character/object images, text action prompt, camera movement, aspect/length, target use (cinematic, motion study, still frame), consent and output rights.
Output: raw generated asset, generation provider/model identity, parameters, costs/credits (if any), artifact hash, provenance, visual/temporal QA and limitations.
Provider-independent adapters may target existing authorized MiniMax credits, Google Flow, local video generators or future models. The default studio workflow remains usable with NO VIDEO GENERATION PROVIDER.

## Game integration boundary
Generated video is not an independently navigable world, physics engine, rigged character or animation graph. It can provide cinematic cuts, motion reference, concept art or verified source frames for future offline animation authoring. Convert and inspect real GLB, animations, geometry, materials, collision and gameplay separately.

Next proposed tests: same character across three different prompts/backgrounds, reference identity drift, forbidden external image use, generated image-to-rig animation feasibility, exact source hash/provenance, and provider substitution with zero changes to scene-editing API.
