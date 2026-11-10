# Approach: instructions for Claude Code

Approach is a volleyball strength-training app (Expo / React Native, iOS + web, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots**. Don't edit `docs/`; if a doc looks wrong or conflicts with the code, stop and say so instead of guessing.

| Doc | What it is |
|---|---|
| `docs/compliance.md` | **Hard rules. Every MUST applies to all work, not only the current release.** |
| `docs/specs/v2.1-soft-launch.md` | Current release: what to build plus acceptance criteria |
| `docs/design/user-flows.md` | Screens, copy, and states for the current release |
| `docs/legal/parent-consent-form.md`, `docs/legal/soft-launch-notice.md` | Source text for `public/consent.html`, `privacy.html`, `terms.html` |

## Current task
Build **v2.1 pass 1** per `docs/specs/v2.1-soft-launch.md`. Work through S1–S11, then check every acceptance criterion and report which pass. Pass 2 (coach board, effort board, Fuel changes, testing days) isn't specced yet, so don't start it. Don't add features that aren't in the spec.

## Always
- Never add analytics, ad, or tracking SDKs, or any new third-party service, without the planning team's approval (`docs/compliance.md`).
- Never add a new server-side data field about users without approval.
- No medical or injury-prevention claims in user-facing copy.
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- When you finish a release: bump the version, update `CHANGELOG.md`, and update `build-snapshot.md` (what's built, data stored, services used, known gaps). The planning team reads that file.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done.
