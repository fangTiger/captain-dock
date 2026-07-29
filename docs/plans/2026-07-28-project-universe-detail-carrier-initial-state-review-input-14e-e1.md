# Review Input — Task 14.20 Detail Carrier Initial-State Fix E1

## Decision Requested

Return exactly one decision: `PASS`, `FIX_REQUIRED` or `DOWNGRADE`.

This is an independent source/static review. Do not run a browser, build, server, port, Lighthouse, Vercel or Git write operation. Architecture owns production 3100 and all browser gates.

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `detail-carrier-initial-state-fix-e1`
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- ImplementationExecutor: GPT-5.6 Sol worker `/root/implement_detail_carrier_e1`
- IntegrationOwner: Architecture Codex `/root`
- Handoff: `docs/plans/2026-07-28-project-universe-detail-carrier-initial-state-handoff-14e-e1.md`

## Review Scope

Read:

1. `AGENTS.md`
2. `.codex/session-state.md`
3. the E1 handoff
4. OpenSpec design §21.1 and Carrier Spine navigation/progressive requirements
5. both final implementation files in full

Editable implementation scope was exactly:

```text
src/components/scene/cinematic-navigation-bridge.client.tsx
src/components/scene/cinematic-navigation-bridge.test.tsx
```

Frozen production E2E:

```text
tests/e2e/cinematic-motion.spec.ts
```

## Baseline and Final Hashes

Baseline:

1. client — `ba246e8c59762d583bc5e213dde765e1edf89ed0aac617bd3ee56766c8b3f628`
2. test — `8a3a7723a1ab0384070442f30da9eb573ba9aa051b3d29ca641973cf3006c595`
3. ordered aggregate — `9f5dffe412332a3ba5110a443f45dd818c5f74871fa6f557afcae85182f0ff6c`

Final:

1. client — `96916231345c154be5d5c164171c7b08fb74ea1f0eacc21f6dbaf464062c8844`
2. test — `e9902f5ae4c315411303f0d4fe04751b027bb034a9dd759eeecd43f1ee907055`
3. ordered aggregate — `f0632bb00054cc4d97385dd01f0eb8eaacf560ccfedd1c41dbbf6963c8f81b53`

Protected hashes remain:

- `.gitignore` — `af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py` — `bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md` — `1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` ordered aggregate — `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts` — `141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`

## Implementation Evidence

RED:

- focused bridge unit: 1 intended failure / 20 preserved passes;
- destination mount immediately exposed `data-case-arrival="settled"` instead of required `entering`;
- production source remained at baseline hash.

GREEN:

- focused bridge unit: 21/21 PASS;
- valid persisted handoff is read and resolved without cleanup inside the lazy state initializer;
- initial destination state projects elapsed progress on the existing 600ms absolute timeline and retains direction/target/token;
- destructive invalid cleanup, effect lease, rAF continuation, hidden completion and unmount cleanup remain in the effect path.

Worker validation:

- focused unit PASS
- scoped ESLint PASS
- typecheck PASS
- cinematic E2E collection 5/5 PASS
- `git diff --check` PASS

Architecture fresh validation:

- `npm run verify`: PASS; ESLint/typecheck clean; 33 files / 390 tests
- strict OpenSpec validation: PASS
- production cinematic E2E collection: PASS; 5 tests
- `git diff --check`: PASS
- final and protected hashes: exact match

## Required Review Questions

1. Does the first observable valid detail handoff state avoid `settled/1/token0` and preserve same destination/direction/target/token with elapsed progress below 1?
2. Is render initialization read-only, with no storage deletion, map deletion, lease mutation, timer or rAF side effect?
3. Do SSR/direct loads fail closed without accessing timeline state after a missing handoff?
4. Are expired/mismatched/reduced/hidden/unmount/StrictMode semantics preserved?
5. Are 120ms departure, 600ms total, start-only storage schema, routes, English public copy, E2E thresholds and production debug surface unchanged?
6. Is the test a real pre-timer regression gate rather than a false green?

## Forbidden Review Actions

- Do not edit any file.
- Do not run browser/build/server/ports/Lighthouse/Vercel.
- Do not change or recommend weakening 50ms, 120ms, 600ms, checkpoint, frame, monotonic or spatial gates.
- Do not fold the separate cold full-Chromium collector risk into this product fix.
