# Handoff Task Package — Task 14.20 Production Detail Fix D1

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `production-detail-preload-height-fix-d1`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after D1–D4 integration
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `09a5406f0dbdf968e7b3bf3a2434315be51554c2a862feddf749564d22fa4cfa`

## Browser / Art Director Findings

Changed production Chromium failed because all four detail routes contain one server-hoisted image preload and all eight default height samples exceed the frozen limit:

- desktop 1440×1000: `3218 / 3218 / 3222 / 3254`, limit `3200`
- mobile 390×844: `3487 / 3527 / 3563 / 3562`, limit `3400`

ReactDOM 19.2.7 automatically hoists an eager image unless its native fetch priority is low. This is not Next `priority`/`preload`. Professional Art Director returned `NO_GO` with no P0 and one P1: SIGNAL/LEDGER mobile default height `3487`.

## Editable Files

```text
src/components/project/project-gallery.tsx
src/components/project/project-case-study.module.css
src/components/project/project-case-study.test.tsx
tests/e2e/project-detail.spec.ts
```

## Frozen Baseline SHA-256

1. `src/components/project/project-gallery.tsx` — `4ff900309d283adf60741ff64dbe6494ea8e1f9c04f6ed7c7e0aa1c9d13a35b8`
2. `src/components/project/project-case-study.module.css` — `16289966b1635a0d41bcea476739b5e88bbf0f614dba4191b2ff8df60356a0a2`
3. `src/components/project/project-case-study.test.tsx` — `ea64989d045a398fe76cda624f43041b59867b3b87b86dd15a5fea29fe04f44a`
4. `tests/e2e/project-detail.spec.ts` — `841ff8ab8d503724776f1a7c380c710c17eecc009b2a794e506f6e9ae0ac1e2c`

## Acceptance Criteria

1. `gallery[0]` remains `loading="eager"` and receives native `fetchPriority="low"` only to suppress React server auto-preload.
2. No image receives Next `priority`, Next `preload`, or high fetch priority; `gallery[1..]` remain lazy and do not receive explicit fetch priority.
3. Raw navigation HTML and hydrated DOM contain zero `link[rel="preload"][as="image"]`.
4. At `scrollY=0`, every route’s representative image still starts a successful request and reaches non-zero natural size.
5. With fonts/media stable and all disclosures closed, all four routes individually meet desktop `<=3200px` and mobile `<=3400px`.
6. Reduce only repeated chapter/Navigator vertical rhythm. Preserve Hero 70–78svh, type sizes, media dimensions, three chapters, sequencer geometry, Proof order, all eleven native disclosures, facts, links and expanded natural height.
7. Expanded desktop/mobile pages keep all facts and have no horizontal overflow or clipping.
8. E2E collects the complete eight-height matrix before failing; do not let the first route hide later failures.

## TDD

RED first:

- component prop spy expects representative `fetchPriority: low`, later images undefined, and still rejects priority/preload/high;
- CSS source contract expects the approved tighter chapter/Navigator rhythm while preserving Hero/Proof/sequencer contracts;
- current production browser RED remains zero image preload plus full height matrix.

GREEN candidate rhythm, subject to tests:

- desktop chapter maximum vertical padding `4rem → 3.5rem`
- desktop Navigator top padding `4.5rem → 3.5rem`
- `<=560px` chapter/Navigator vertical padding `var(--space-md)`
- `<=560px` chapter header/body gap `var(--space-lg)`

Do not weaken `3200/3400`, change fonts/media size, delete content, or constrain expanded height.

## Forbidden

- Every file outside the four-file allowlist.
- Catalog, project TSX structure, Hero, signature, media registry/assets, routes, metadata, JSON-LD, links, dependencies, budgets, Playwright config, Carrier/Canvas/stages.
- Browser, build, server, ports, Lighthouse, Vercel, commit/reset/restore.

## Worker Validation

```bash
npm test -- --run src/components/project/project-case-study.test.tsx
./node_modules/.bin/eslint src/components/project/project-gallery.tsx src/components/project/project-case-study.test.tsx tests/e2e/project-detail.spec.ts --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/project-detail.spec.ts --list
git diff --check
```

Deliver RED/GREEN evidence, final hashes/aggregate, criteria coverage and browser-only residual risk.
