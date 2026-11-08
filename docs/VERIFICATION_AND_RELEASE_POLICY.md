# Contribution and Verification Policy

The Nomadic Game Development Studio is an **engine-agnostic, local-first AI development toolkit**. Every engineering improvement should be reported with its actual maturity and verified evidence before it is described as available to external developers or public users.

## Required development checkpoints

1. **RESEARCHED** — References, upstream links, relevant versions, licenses, realistic feasibility assessment. No runtime claim.
2. **WRITTEN** — Code or documentation exists on disk. No claim that it runs.
3. **IMPLEMENTED** — Actual integration is connected and runnable in a specifically identified isolated environment.
4. **TESTED** — Tests were executed at an exact source revision, with exit status and failures or skips preserved.
5. **VERIFIED** — Independent relevant evidence confirms the result (e.g. native editor interaction, screenshot pixels, full rollback, asset IDs and exact software environment).
6. **ACCEPTED** — Explicit acceptance criteria, real visual-quality bar, security/permission gates, licensing and target device requirements all pass. Never infer acceptance from a green unit test.
7. **RELEASED** — A commit/tag or release asset was published, its publicly accessible URL confirmed, and installation/redistribution limits accurately described.

Mark blocked dependencies **BLOCKED**, never silently skip or mark them complete.

## Publication requirements

A public repository update must include:

- Exact scope and source revision; code and tests where applicable.
- Changed behavior, dependencies, interfaces and *known unimplemented capabilities*.
- Reproducible steps or proof that a test cannot currently be run.
- Results: passed, failed and skipped, with meaningful native integration evidence.
- Per-engine compatibility, never a blanket claim of universal support.
- Security/privacy and license review for any imported code and assets.
- Whether a result was inspected independently or merely reported by an agent.
- Release notes describing what testers can and cannot use.

Never publish personal file paths, authenticated session traces, secrets, temporary tokens, private project source or game imagery, or third-party data without redistribution rights. Summarized anonymized results and hashes are generally sufficient for initial public evidence.

## Game graphics success criteria

A game-engine adapter is only ready after isolated native integration proves source identity, permissions, controlled camera/actor navigation, *actual rendered frames*, independent visual comparison to a suitable reference, source persistence, failure recovery and resource utilization. MiniMax (or other model) visual analysis is a hypothesis; it is not equivalent to an accepted art review.

For development-speed superiority, use the pre-registered [A/B experiment](THROUGHPUT_EXPERIMENT_PROTOCOL.md) and report full results including misses, regressions, intervention counts, inference expense and native GPU measurements.

## When to publish

Publish after each verified **bounded milestone**, rather than waiting for an entire studio product. Preserve existing work and avoid mixing unverified experimental drivers into the stable branch. Do not interrupt active game-development workers or use GPU resources without admission. Separate research documentation from operational support.
