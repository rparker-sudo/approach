# Approach: instructions for Claude Code

Approach is a volleyball strength-training app (Expo / React Native, iOS + web, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots** (hand-off of Fri Nov 13, 2026). Don't edit `docs/`. If a doc looks wrong, conflicts with another doc in a way the precedence rules below don't settle, or conflicts with the code, **stop and say so** instead of guessing.

| Doc | What it is |
|---|---|
| `docs/specs/v2.2.md` (v1.3) | **The current task.** Delta from v2.1.1 in three passes, with acceptance criteria. Start here. |
| `docs/compliance.md` | **Hard rules. Every MUST applies to all work, not only the current release.** Includes § Level, § Multiple teams, C11, C12, and the founder/district rules. |
| `docs/legal/v2.2-copy-review.md` | Legal's final wording: 22 copy fixes, G3 pain message, G4 head-injury line, Q-7 visibility, station-field approval |
| `docs/specs/v2.1-pass-2.md` (v1.3) | Pass 2 of v2.2 builds the parts of this spec that v2.1.1 didn't (v1.1–v1.3 changes), as listed in `v2.2.md` §2.1 |
| `docs/specs/rack-groups.md` (v1.0) | Rack groups (pass 2), with the changes in `v2.2.md` §2.3 |
| `docs/content/safety-guidelines.md` | Training rules (§2a level resolution, §3 rest floors, §4a testing, §6 rack sizes) |
| `docs/content/drill-library.md` | §3 copy fixes, §4 six new mobility exercises (code-ready) |
| `docs/content/tagging-taxonomy.md` | Tags and fields, incl. A8 data fixes |
| `docs/content/programs/testing-day-checklist.md` | Coach checklist (Part 1), testing warm-up (Part 2), date suggestions (Part 3), Q-7 two-team level rule (Part 4) |
| `docs/content/programs/extra-recovery-sessions.md` | ER1–ER5 (JSON + acceptance criteria) |
| `docs/content/programs/rest-and-supersets.md` | Tiers for all 74 exercises, rest table and floors, supersets |
| `docs/content/programs/home-workouts.md` | Home workouts, `HOME_RX`, 4 new home exercises |
| `docs/content/programs/circuits-and-stations.md` | Circuits (Part 1) and station rotation (Part 2) |
| `docs/content/v2.2-training-handoff.md` | Background: Training's T1–T13 and I1–I7 (for context; the spec says what to build) |
| `docs/content/fuel-cards.md` | Fuel tab card content (unchanged) |
| `docs/design/user-flows.md` (v2.0) | Screens F1–F23 |
| `docs/design/user-flows-v2.2-pass1.md` | Screens F24–F26 (level, testing checklist and dates, effort clamp) |
| `docs/design/user-flows-v2.2-pass3.md` | Screens F27–F30 (circuits, Stations builder, running stations, board station grid) |
| `docs/legal/parent-consent-form.md`, `docs/legal/soft-launch-notice.md` | Source text for `public/consent.html`, `privacy.html`, `terms.html` (form **v2**, coach-recorded) |
| `docs/specs/v2.1-soft-launch.md` | v2.1 pass 1. **Already built** (history only) |

## Current task: build all of v2.2 in one session
Follow the **Build plan** at the top of `docs/specs/v2.2.md`. It replaces the per-pass versions and deploys in that spec's "Three passes" table.

1. **Build in order: pass 1 → pass 2 → pass 3.** Later passes depend on earlier ones (`resolveSession` and level in pass 1; racks in pass 2; stations need racks). Commit as you go.
2. **Migrations** `supabase/migrations/005_approach_2_2_p1.sql`, `006_approach_2_2_p2.sql`, `007_approach_2_2_p3.sql`, in that order. Each must be safe to run once on the live project (which has 002–004). Fold them into `schema.sql`. Add "Upgrading from 2.1" steps to the README.
3. **Check every acceptance criterion in all three passes** and give **one report** with pass/fail per criterion, grouped by pass.
4. **If any pass 1 criterion fails, stop and report before deploying.** Pass 1 holds the gates before the first minor.
5. **C13 (legal pages + contact email) is the last step.** `docs/compliance.md` still names the old club address (Ryan@thehbcvbc.com). The founder decided to move to a new Approach-domain address (TM-10), and it hasn't been chosen yet. So when you reach C13: **stop and ask Ryan for the new address. Never deploy a placeholder or the club address on the regenerated pages.**
6. **Version 2.2.0.** One CHANGELOG entry with a section per pass. Update `build-snapshot.md` once. Tag `v2.2` locally after the deploy (tag pushes from the cloud are blocked; Ryan runs `git push origin --tags` from the Mac).
7. Don't add features that aren't in the specs.

## When docs disagree (precedence)
1. `docs/compliance.md` MUST / MUST NOT rules always win.
2. Then `docs/specs/v2.2.md`.
3. Then `docs/legal/v2.2-copy-review.md` for any user-facing wording.
4. Then the content docs (`docs/content/`), then the design docs (`docs/design/`).

Known conflicts, already settled:
- **G4 head-injury line:** use copy review §3. `safety-guidelines.md` §5 and `user-flows.md` F14 still show the older text.
- **G3 / F14:** F14's note that Legal's wording is "pending" is out of date; copy review §2 approved it as written.
- **Two teams, different levels:** use the **lower** level (spec 1.1, `testing-day-checklist.md` Part 4, copy review §4). `compliance.md` § Level item 8's open question is answered by those.
- **Jump results:** inches/feet everywhere, never % (spec 2.1, FA-4). The effort-board tab is **"Jump gains."** `v2.1-pass-2.md` P4.1 "% gain" and the old "Improvement" name are superseded.
- **`v2.1-pass-2.md` "version stays 2.1.x / tag v2.1"** and **`rack-groups.md` "not handed off"** are stale headers. This build is 2.2.0.
- **F19c blocked-pair reason** "Supersets are for 2 strength exercises…" is retired (F24 addendum, F27b).
- **Home athletes and the live board:** follow spec 3.1 (they don't appear on the live view). F23's "At home 4" count and home-day ticker lines are **[UX proposal]** items that conflict; leave them out and list them in your report.
- **Other [UX proposal] items** (F9a paging, F9b "Other athletes," F13 dropped-slot line, F16a no break over a testing day, F29a "Rotate now" confirm): Product hasn't confirmed them yet. Build them as drawn, and list them in your report so Product can keep or cut them.
- **Status columns** in `safety-guidelines.md` §10 and `tagging-taxonomy.md` Part B are out of date. Ignore them; the spec decides what's built.
- **Rack partner names (B5):** ship count-only ("with 2 teammates") behind one flag, per spec 2.3.

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`). Don't create a new copy or "master" folder for a new version.** Versions are tracked with git: commit as you go, and tag each release. Keep `CLAUDE.md` and `docs/` in place; they're the planning team's hand-off.
- `~/Downloads/approach-2.0` is an old v2.0 copy. Never work there.

## Always
- Never add analytics, ad, or tracking SDKs, or any new third-party service, without the planning team's approval (`docs/compliance.md`).
- Never add a new server-side data field about users unless the spec lists it (rule G-5). Anything only for the individual athlete (home equipment, etc.) stays on the device (G-3).
- Every session an athlete sees goes through `resolveSession` (G-1). No other code path builds an athlete's session.
- Boards never show weights, loads, RPE, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, or experience level (G-4).
- No medical, injury-prevention, treatment, or guaranteed-results claims in user-facing copy (G-6).
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- When you finish a release: bump the version, update `CHANGELOG.md`, and update `build-snapshot.md` (what's built, data stored, services used, known gaps, and every placeholder or judgment call you made). The planning team reads that file.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done.
