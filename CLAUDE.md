# Approach Strength: instructions for Claude Code

Approach Strength is a strength-training app for volleyball teams and, from 2.3.0, for personal trainers with adult clients (Expo / React Native, web build first, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

**Live now:** v2.4.1 (generator v3 on by default + week setup), deployed 11/19. Local `main` is at `1a9a437` (deploy snapshot), tag `v2.4.1` at `1daffb7`. Flags as deployed: `generatorV3`, `catalogV3`, `rackRotation` all **on**. App on `app.approachstrength.com`; website on `approachstrength.com` (repo `rparker-sudo/approachstrength-site`), `/terms` v2.6.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots** (this hand-off: Thu Nov 19, 2026, "2.4.2"). Don't edit `docs/`. If a doc looks wrong, or conflicts with the code or another doc in a way the rules below don't settle, **stop and say so** instead of guessing.

**Precedence when docs disagree:** `docs/compliance.md` → `docs/specs/v2.4.2.md` → `docs/content/programs/program-planner-v3.md` → the other `docs/content/` docs (`generator-v3-rulings.md` and `programs/home-and-mobility-v3.md` ahead of older content docs) → `docs/design/user-flows-planner-v3.md` → `docs/design/user-flows-training-v3.md` → `docs/specs/v2.4.1.md` → older specs and flows. The "Known conflicts" section below overrides all of them.

| Doc | Version this session expects | What it is |
|---|---|---|
| `docs/specs/v2.4.2.md` | **Draft v1.1** (Fri Nov 20) | **The task.** Parts A, B, C, D, E (v1.1 adds Part E, day-of racks, D-069) |
| `docs/content/programs/program-planner-v3.md` | **v1.0** (new) | The planner: §1 length, §2 rack-aware generation, §3 coaching layer, §4 criteria. Follow exactly |
| `docs/content/program-design.md` | v3.0 (adds the "Next (11/20)" pointer line) | §4a, §4b, §7 templates, §8 ladders, §9 limits |
| `docs/content/programs/home-and-mobility-v3.md` | **v1.0** (unchanged) | Home and mobility days |
| `docs/content/generator-v3-rulings.md` | **v1.1** (unchanged) | R-1 to R-6 |
| `docs/content/programs/warmups.md` | **v1.1** (unchanged) | Warm-ups and minute estimates |
| `docs/content/exercise-catalog-v3.md` | **v3.1** (unchanged) | Catalog |
| `docs/design/user-flows-planner-v3.md` | **v1.3** (new) | **F57–F62** and **F64** (Today's racks). **F63 isn't scheduled; don't build it** (known conflict 11) |
| `docs/compliance.md` | **updated Thu Nov 19 (… 2.4.1 check; 2.4.2 check)** | § 2.4.2 check: the three keys approved and in V4; claim check; rack groups; testing suggestions |
| Everything else in `docs/` | unchanged since the 2.4.1 hand-off (`9f7ef51`) | As built |

**Version check (do this first):** if a header above doesn't match, **stop and tell Ryan**.

## Step 0
1. `git pull` on `main`. Confirm `main` has the 2.4.1 deploy (`1daffb7`, plus `1a9a437` if Ryan has pushed it) and `reports/v2.4.1-acceptance.md` shows no Part A or Part D failure (the Coordinator checked: none). If not, stop and ask Ryan. `origin/main` lagging local `main` by the snapshot commit is not a failure.
2. Create branch **`v2.4.2`** from `main`. This hand-off (`CLAUDE.md` and the `docs/` changes) is uncommitted on `main`; it carries over. **Commit it on `v2.4.2` first:** "Planning hand-off: 2.4.2 (program planner v3)". Don't commit `.claude/settings.local.json`. (`v2.4.1` is both a branch and a tag, so `git` calls it ambiguous; use `refs/tags/v2.4.1` when you mean the tag.)
3. Run the version check above. Then spec Step 0.3 (compliance lists `program.endDate`, `program.endType`, `program.generatedFormat` in V4: it does) and Step 0.4 (`docs/design/user-flows-planner-v3.md` exists: it does).

## Current task: build 2.4.2 (`docs/specs/v2.4.2.md` v1.1)
**Order: Part A → Part B → Part C → Part D → Part E.** One commit per part. Version 2.4.2. Branch `v2.4.2`. **No migration.**
- **Part A:** program length planner (planner §1, spec A1–A4; UX F57, F58, F59).
- **Part B:** "Your weight room" setup step and style suggestion (planner §2a, spec B1–B3; UX F60).
- **Part C:** rack-aware generation (planner §2b–§2d, spec C1–C4). The §2c tables are acceptance tests, run as spec C2 (D-068.2) says: full weight room, then the 11/18 room.
- **Part D:** coaching layer and cooldown (planner §3, spec D1–D4; UX F61, F62).
- **Part E:** day-of racks: roll call, rebalance preview, confirm, late arrivals, Start prompt (spec E1–E5; UX **F64**). **Gated on Legal (known conflict 10): before starting Part E, check that `docs/compliance.md` has Legal's Part E confirmation. If it doesn't, stop after Part D and tell Ryan.**
- **Kill switch:** `plannerV3: true` in `src/lib/flags.ts` (code constant). `false` restores the 2.4.1 builder and generator with no other change, and none of F57–F62 or F64 render.

## Data: only three new keys
- The **only** new program JSON keys are **`program.endDate`** (ISO `YYYY-MM-DD`), **`program.endType`** (`'season' | 'testing' | 'break' | 'none'`), and **`program.generatedFormat`** (`'standard' | 'stations' | 'rack_rotation'`). Approved by Product (D-066) and Legal (compliance § 2.4.2 check #1, with its conditions).
- **Anything else** (a table, column, server field, or any other program JSON key, including `program.startDate`, which planner §1e mentions; use the existing `program.blockStart`): **stop and ask** (G-5).
- Not stored anywhere on the server: athletes per session, the plan timeline, "Not now" on the ended banner (device), cooldown Done (device), the day's Who's here list and each athlete's last rack (coach's device only, cleared the next day; **never written to `attendance`**). Confirmed racks go to the existing `rack_groups` / `rack_group_members` only.
- Schema diff must be empty. Network check: athletes per session is in no request body. Say both in the report and in `build-snapshot.md` (list the three keys).

## Stop rule and deploy
- If **any Part A or Part C criterion fails**, or the spec's **Data** criterion fails, **stop and report. Don't deploy.** Ryan chooses: fix first, or ship with `plannerV3 = false`.
- A Part B, Part D, or Part E failure is reported and Ryan chooses.
- **Every earlier volleyball and trainer-mode check must still pass** (spec: nothing earlier is superseded). Re-run what the 2.4.1 report lists: `tsc`, `lint`, `build:web`, `run-all.sh`, the SQL suites (fresh and upgrade), the 2.4.1, 2.4.0, 2.3.0, and 2.3.1 browser suites, and the claim-word search **including "durability"** on all built strings (planner cues, notes, and every new UX string). **An earlier check that fails is a stop, like Part A/C.** A suite whose runner isn't in the repo (the 2.2 / 2.2.1 / 2.1 browser suites) is listed as "not run" with the reason, never as a pass; Ryan decides.
- Save **`reports/v2.4.2-acceptance.md`** (one row per criterion: pass / fail / partial, with evidence) **before** asking Ryan to approve the deploy. Include: every spec criterion (A, B, C, D, E, Data), the UX acceptance list at the end of `user-flows-planner-v3.md` plus F64l (Part E), the earlier checks, and a "For Product / Training / Legal" section with each item in Known conflicts 4–6 and 10–12.
- **Deploy steps (only after Ryan approves):**
  1. Merge `v2.4.2` into `main` and deploy the app. **No migration and no website change.**
  2. Record in `build-snapshot.md` §8 "2.4.2": what was deployed, when, flag values (`plannerV3` new, on), and the three new keys.
  3. Update `CHANGELOG.md` and the app version (2.4.2).
  4. Ryan pushes `main` and tag `v2.4.2` from his Mac.

## Known conflicts, already settled
1. **Spec dependency statuses:** D2 (Legal) is done for Parts A–D and the three keys (compliance § 2.4.2 check; the spec's "pending Legal" is resolved: approved), but **not yet for Part E** (conflict 10). D3 (UX) is done, Part E included (`user-flows-planner-v3.md` v1.3, F64); the spec's "flows don't have Part E yet" note is stale.
2. **§1b vs §1c:** settled by the spec (D-068.1): the §1c table wins. The 8-week Season-starts plan is Accumulation 3 → Strength 3 → Power 2.
3. **Legal's conditions win over the docs** (compliance § 2.4.2 check):
   - `endDate` suggestions come only from **this team's own** first practice or match; store the date only (no event id, opponent, or location).
   - Auto-created rack groups use the D-026 balanced mix (roster, level, position only); for an athlete on two teams, use the D-031 lower level without revealing the other team.
   - Testing suggestions are date markers only and unlock nothing. The 48-hour rule checks **every** team on the athlete's combined calendar (neutral reasons for the coach); if no lift day qualifies, suggest an earlier day or none. The week-1 baseline ("no result in the last 12 weeks") uses **this team's** testing days only.
   - **Testing labels:** Legal allows only "Testing day" or "Strength check." UX's chip "Test suggested · Thu Dec 3" becomes **"Testing day suggested · Thu Dec 3"**, and the week-header suffix " · Test suggested Thu" becomes **" · Testing day suggested Thu"**. Never "max test," "1RM," or "max out."
   - No purpose line on the cooldown ("helps you recover," "reduces soreness"). Keep "Spot" as the position label.
   - Percentages and loads in week notes and "what changed" never reach a board (G-4).
4. **"Ends fresh" (Legal's recommended change, applied here):** Legal flagged the planner §1d summary "Ends fresh for the first match on Jan 26." as reading like a promised outcome. Build it as **"Tapers into the first match on Jan 26."** Apply the same change to UX's variants: F59a no-match tail → **"Tapers into the season."**; F58c Season starts line → **"Tapers into the first match or practice."** The summary-line criterion ("planner example exact") is met by the planner string with this one substitution. List it for Training/UX to confirm.
5. **UX's open [Product] / [Training] items:** build them **as UX drew them** and list each in the report for Product or Training to confirm: F58b short last week (plan whole weeks; the short week is part of the last block); F58c default end type; F58d end date = the Sunday before the event's week; F60d rack groups created **on Build**, not on tap; F59g athlete line after the end date; F62d cooldown rows log no sets and Done is device-only; F57b "Time of year" chips; F62a/F62b cues and "what changed" follow the athlete's resolved exercise; F59a tail sentences.
6. **New UX strings haven't had Legal's claim check** (UX flagged them; Legal's § 2.4.2 check covered the planner's strings only): F58c end-type lines, F59a summary tails, F60c card lines, F60d info lines, the F59g athlete line. Build them as written (with fixes 3 and 4), run the claim-word search on them, and list them in the report as a Legal item. Not a stop.
7. **Training's D4 items** (Day 2 R2 order, §2c timing arithmetic, out-of-range layouts D-068.3) aren't blocking. Build the §2c tables as written; report the actual minutes for Day 1, Day 2, and in-season Day 1 Heavy at 60 min and at the 11/18 setup's length, with each `fitLog` line.
8. **Not in 2.4.2** (spec §5): athlete self check-in ("I'm here" on the athlete's phone), Who's here saved as attendance, rack rotation Pause and per-rack clocks, rotation haptic, a coach-chosen bar per exercise, the D-049 RPE note, storing athletes per session, planner support for trainer goal programs, website changes, the trainer AI assistant (migration 014), CSCS review. Don't build them.
9. **UX v1.3's kill-switch and acceptance lines say F57–F62;** F64 also doesn't render with `plannerV3 = false` (F64a says so). Treat the "All" UX criterion as F57–F62 and F64.
10. **Part E is waiting on Legal.** Spec v1.1 says Legal must confirm Part E before hand-off (D2: day-of racks add no new data, Who's here stays on the coach's device and never in `attendance`, absence is never shown). At this hand-off, `docs/compliance.md` has no Part E confirmation yet. Build Parts A–D now. **Before Part E, check `docs/compliance.md` again** (Ryan or the Coordinator will copy Legal's update in). If the confirmation isn't there, stop after Part D, report A–D, and ask Ryan. Don't start Part E on your own reading of the rules.
11. **F63 (rack rotation controls on the coach board) isn't in 2.4.2.** UX drew it at the founder's request, but Product hasn't scheduled it (UX flag 9; spec E4 says "if F63 is scheduled"). Don't build F63 or F63c-2. The Part E Start prompt (F64h) is on the Team screen only.
12. **UX's Part E items for Product:** build as UX drew them and list in the report: "the coach's Today" = the Team screen card plus a status line on TeamHome (F64a); Shuffle = balanced mix from scratch for today, ignoring fewest moves (F64e); the "another device" state (F64j). Part E's new strings ("Today's racks," "Who's here," "Not here today," F64 info lines and prompts) go through the claim-word search and the Legal list in the report.
13. From earlier hand-offs (unchanged): F56f / D-068.5 Rebuild keeps `'coach'` sessions; Legal's 2.4.1 copy fixes ("Home Care," "Care work is on…," "Approach Strength's new programming," no user-facing "durability"); 2.3.1 custom exercises are coach-built content (D-058); level toggle precedence is most specific wins; spotter label "Spot."

## Hard stops (any part)
- **Any new table, column, server field, or program JSON key other than the three above:** stop and ask (G-5).
- **Any domain, DNS, repo-variable, Pages, or Supabase setting change:** don't make it.
- **Website:** no change in 2.4.2.
- **No find-and-replace on legal wording** in any script.
- **No AI provider, SDK, or call** (TM-18).
- **A general team must never accept a minor** (compliance T1).
- **Another team's events never show to a coach** (end-date chips, plan markers, testing suggestions, R-4, summaries use neutral reasons only).
- **Part E privacy:** Who's here is never sent to the server or written to `attendance`; absence never appears to athletes, teammates, or the board; the board never shows roll call, missing counts, or move tags; no screen calls this "check-in." Rebalance reads only roster, level, position, and Who's here (no `test_results`, loads, `readiness`, or birth year).
- **Nothing new on boards:** `SessionSummary` and `CoachingNote` (and any component that renders notes) are never imported under `src/app/board/` or the effort board.

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`).** Don't create other copies. Keep `CLAUDE.md` and `docs/` in place.
- `~/Downloads/approach-2.0` is an old v2.0 copy (not a git repo). Never work there.

## Always
- No analytics, ad, or tracking SDKs, or new third-party services, without the planning team's approval.
- No new server-side data field about users unless the spec and compliance list it (G-5). Individual-only data stays on the device (G-3).
- Every session an athlete or client sees goes through `resolveSession` (G-1).
- Boards never show weights, loads, RPE, percentages, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, experience level, cues, week notes, or "your version" (G-4).
- No medical, injury-prevention, treatment, or guaranteed-results claims (G-6).
- Earlier checks still pass (none are superseded by 2.4.2).
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done. A check that doesn't run counts as a failure.
