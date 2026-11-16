# Approach Strength: instructions for Claude Code

Approach Strength is a strength-training app for volleyball teams and, from 2.3.0, for personal trainers with adult clients (Expo / React Native, web build first, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

**Live now (per `build-snapshot.md` §6):** v2.2.1, with the app on `app.approachstrength.com` and the website on `approachstrength.com` (repo `rparker-sudo/approachstrength-site`). The 2.2.1 report still has live rows pending (see Step 0).

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots** (hand-off of Sun Nov 15, 2026). Don't edit `docs/`. If a doc looks wrong, or conflicts with the code or another doc in a way the rules below don't settle, **stop and say so** instead of guessing.

**Precedence when docs disagree:** `docs/compliance.md` → `docs/specs/trainer-mode.md` → `docs/legal/` → `docs/content/` (adult rules, goals, general library, taxonomy) → `docs/design/trainer-mode.md` → older specs and flows.

| Doc | Version this session expects | What it is |
|---|---|---|
| `docs/specs/trainer-mode.md` | **Draft v0.3** (Sun Nov 15) | **The current task.** 2.3.0 = Phase A + Phase B, no AI. §B10 (AI) is 2.3.1: don't build any of it |
| `docs/compliance.md` | **updated Sun Nov 15** (§ Trainer mode T1–T11) | **Hard rules. Every MUST applies to all work.** T4 is the complete list of new server fields allowed |
| `docs/legal/soft-launch-notice.md` | **Draft v2.5** (Sun Nov 15) | Source text for `/privacy` (Parts A and **A2**, anchor `#health-data`) and `/terms` (incl. **§4T**, anchor `#trainer-terms`). Publish exactly; no script edits |
| `docs/legal/parent-consent-form.md` | updated 11/14 (unchanged) | Source for `/consent` |
| `docs/content/adult-training-rules.md` | **v1.0** | Adult hard rules A1–A9, caps, cardio, acceptance §10 |
| `docs/content/programs/adult-goals.md` | **v1.0** | The four goals, defaults, ramp, waves, acceptance §6 |
| `docs/content/general-library.md` | **v1.0** | 39 exercises (code-ready), 13 equipment items, `whyGeneral`, warm-ups W1–W3, acceptance §8 |
| `docs/content/tagging-taxonomy.md` | **v1.2** | Part C: T-A1 hide list (0 exercises hidden), `scope`, new fields |
| `docs/design/trainer-mode.md` | **v1.0** | Screens F31–F44 and the Trainer/Client string list §S |
| `docs/specs/v2.2.1.md`, `marketing-site.md`, `v2.2.md`, `rack-groups.md`, `v2.1-*.md`; `docs/design/user-flows*.md`, `marketing-site.md`; `docs/copy/`; other `docs/content/` | unchanged | Reference for what's already built |

**Version check (do this first):** if any header above doesn't match the version in this table, **stop and tell Ryan**.

**Not handed off (by design):** `design/user-flows.md` v3.2 and `design/design-system.md` v1.1, which `docs/design/trainer-mode.md` mentions. The behavior they describe is already built (2.2.1). Where `trainer-mode.md` cites them: "design system §9" = the board-safe rule G-4; "§13.2" = 44 pt targets and 56 pt in-workout actions; F8, F14, F16, F19–F24 = the screens as built. `safety-guidelines.md` §2b (level checklist) is already in `src/lib/levelChecklist.ts`; reuse it for adult clients.

## Step 0: close out 2.2.1 before starting 2.3.0
1. Update `reports/v2.2.1-acceptance.md` rows 1–3, 29, and 31 with the live results (HTTPS and deep links on `app.`, the github.io redirect, auth emails end to end, the two-device board test, tags pushed). Ask Ryan for anything you can't check yourself.
2. Fix `build-snapshot.md` §1, which still says 2.2.1 is "Not deployed yet" while §6 says it's deployed.
3. Report the marketing site's status: whether Part B (screenshots) and Part C (marketing site) were done, and where `reports/marketing-site-acceptance.md` is. **Don't build or change the marketing site in this session** beyond the one footer link in Step 2.4.
4. **If any 2.2.1 live row fails, stop and report. Don't start 2.3.0.**

## Current task: build 2.3.0 trainer mode (`docs/specs/trainer-mode.md` v0.3)
1. Commit this planning hand-off first if it isn't committed.
2. Build in a branch `v2.3.0`, **Phase A, then Phase B**. **No AI** (compliance T7): no AI packages, calls, Edge Functions, labels, toggles, or placeholders, and no `ai_assisted` column.
3. Migrations `009_trainer_a.sql` and `010_trainer_b.sql`, each safe to re-run, folded into `schema.sql`. Add "Upgrading from 2.2.1" steps to the README, including the SQL Ryan runs (service role) to set and clear `teams.trainer_verified_at` / `_by`. **Don't build any in-app admin control for verification.**
4. **Website (`rparker-sudo/approachstrength-site`):**
   1. Regenerate `/privacy` and `/terms` from `docs/legal/soft-launch-notice.md` v2.5 with the existing generator. Part A2 must be reachable at `/privacy#health-data` and §4T at `/terms#trainer-terms`. `legal-pages-match.py` must pass.
   2. Add a footer link **"Consumer health data"** → `/privacy#health-data` on every page of whatever is live at the apex (placeholder or marketing site). Compliance (Marketing site rules, T10) requires it; it's the only text change allowed on the website in this session.
   3. **No trainer or gym content** on the website (compliance T8).
5. Check **every** acceptance criterion and save **`reports/v2.3.0-acceptance.md`** (one row per criterion: pass / fail / partial, with evidence) **before** asking Ryan to approve the deploy. Include all of:
   - spec §A6 (Phase A) and §B11 (Phase B);
   - compliance T10;
   - adult rules §10; adult goals §6; general library §8; taxonomy C1;
   - design `trainer-mode.md` "Acceptance (UX sign-off)" and the §S0.4 string search;
   - a re-run of the v2.2 and 2.2.1 checks for volleyball teams.
6. **Stop rule (TM-17):** if any **Phase A** criterion fails, **stop and report before deploying.** Any other failure is listed as fail, never as pass.
7. **Deploy precondition (G3/G4 wording):** see "Known conflicts" item 5. Don't deploy until Ryan confirms Legal's wording.
8. Ask Ryan to approve the deploy. Deploy app and website as **2.3.0**, tag `v2.3.0`, and update `CHANGELOG.md` and `build-snapshot.md` (incl. every new table and column, with its compliance T4 row).

## Known conflicts, already settled
1. **Class board default for clients:** `design/trainer-mode.md` F33 shows "Class board: On." **Compliance T6 and Privacy Part A2 win: off by default** for general-team clients. Check-ins and sharing are off too (F33 already says so).
2. **Weekly caps across all programs posted to one client** (adult rules §4, F36): build the combined-total check, with a block on over-cap posts. Product hasn't confirmed it in the spec yet; list it in the report.
3. **Unverified trainer:** she can build programs but can't post them (F32a, Terms §4T.2, compliance T3.6). Build it that way.
4. **Equipment removed from the gym profile** (F40): build the warning and the switch to the closest exercise for each client, as drawn. Product hasn't confirmed; list it in the report.
5. **G3 pain card and G4 head-injury line in general teams** (`trainer-mode.md` §S1b): **Legal hasn't approved the trainer versions yet.** Build them with the §S1b text in one place (a single constant each), and mark them "pending Legal" in the report. **Before the deploy, ask Ryan whether Legal approved them or supplied different text.** Don't deploy them unapproved, and don't use the volleyball wording (it mentions parents and school protocols).
6. **Table and column names:** the spec's `programs.target_user_id` and `groups.name` map to the existing `team_programs` and `team_groups` tables. Every **new** table or column must correspond to a row in compliance T4 (trainer Terms record, verification, `teams.kind`, target client, group name, goal, gym equipment profile, cardio minutes, templates). Anything else: **stop and ask** (G-5).
7. **`teams.kind`** can't change once a team has members (compliance T4).
8. **Other Product/Training/UX flags** inside the content and design docs (e.g., "lowest level among targets" for group caps, F33/F40 confirmations, "minors" rules as warnings in general teams): build them as written and list them in the report for the planning team.
9. **Adult volleyball "Your choices" defaults** (compliance T5 flag): **not in 2.3.0.** Don't change volleyball defaults.
10. The string **"Return to training"** must not appear anywhere (spec B11).

## Hard stops (any part)
- **Any new table or server field** not covered by compliance T4 (or earlier approvals): **stop and ask.**
- **Any domain, DNS, repo-variable, Pages, or Supabase setting change** not listed in the spec: don't make it. Record every change you do make (old → new) in `build-snapshot.md`.
- **Any text change on the website or legal pages** beyond the docs and the one footer link: don't make it. Ask.
- **No find-and-replace on legal wording** in any script.
- **Any AI provider, SDK, or call:** don't add it (TM-18).
- **A general team must never accept a minor** (compliance T1): if any path allows it, stop.

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`) and `rparker-sudo/approachstrength-site`.** Don't create other copies. Commit as you go and tag each release. Keep `CLAUDE.md` and `docs/` in place; they're the planning team's hand-off.
- `~/Downloads/approach-2.0` is an old v2.0 copy. Never work there.

## Always
- Never add analytics, ad, or tracking SDKs, or any new third-party service, without the planning team's approval (`docs/compliance.md`).
- Never add a new server-side data field about users unless the spec and compliance list it (rule G-5). Anything only for the individual (home equipment, etc.) stays on the device (G-3).
- Every session an athlete or client sees goes through `resolveSession` (G-1). No other code path builds a session.
- Boards never show weights, loads, RPE, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, or experience level (G-4).
- No medical, injury-prevention, treatment, or guaranteed-results claims in user-facing copy (G-6). Run the claim-word search on the new library text.
- **Volleyball teams don't change.** Every v2.2.x check still passes for them, and their strings stay exactly as in 2.2.1.
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- When you finish a release: bump the version, update `CHANGELOG.md`, and update `build-snapshot.md` (what's built, data stored, services used, known gaps, and every placeholder or judgment call you made). The planning team reads that file.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done. A check that doesn't run counts as a failure.
