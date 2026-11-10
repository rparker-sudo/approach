# Approach: instructions for Claude Code

Approach is a volleyball strength-training app (Expo / React Native, iOS + web, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots**. Don't edit `docs/`; if a doc looks wrong or conflicts with the code, stop and say so instead of guessing.

| Doc | What it is |
|---|---|
| `docs/compliance.md` | **Hard rules. Every MUST applies to all work, not only the current release.** |
| `docs/specs/v2.1-soft-launch.md` | v2.1 pass 1: compliance + safety fixes, with acceptance criteria |
| `docs/specs/v2.1-pass-2.md` | v2.1 pass 2: coach board, effort board, testing days, Fuel phase 1 |
| `docs/content/fuel-cards.md` | Fuel tab card content |
| `docs/design/user-flows.md` | Screens, copy, and states for the current release |
| `docs/legal/parent-consent-form.md`, `docs/legal/soft-launch-notice.md` | Source text for `public/consent.html`, `privacy.html`, `terms.html` |

## Current task
Build **v2.1** in two passes:
1. **Pass 1** per `docs/specs/v2.1-soft-launch.md` (S1–S11). Check every acceptance criterion and report which pass. **Stop and report before starting pass 2.**
2. **Pass 2** per `docs/specs/v2.1-pass-2.md` (P1–P8), only after pass 1 passes. Check its acceptance criteria and report.

Don't add features that aren't in the specs. Tag `v2.1` after both passes.

## Versions and folders
- **Work in this folder. Don't create a new copy or "master" folder for a new version.** Versions are tracked with git: commit as you go, and tag each release (`v2.1`). Keep `CLAUDE.md` and `docs/` in place; they're the planning team's hand-off.
- If this folder isn't a git repository yet, say so and ask before initializing one or connecting it to the GitHub repo.

## Always
- Never add analytics, ad, or tracking SDKs, or any new third-party service, without the planning team's approval (`docs/compliance.md`).
- Never add a new server-side data field about users without approval.
- No medical or injury-prevention claims in user-facing copy.
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- When you finish a release: bump the version, update `CHANGELOG.md`, and update `build-snapshot.md` (what's built, data stored, services used, known gaps). The planning team reads that file.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done.
