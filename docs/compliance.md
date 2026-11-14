# Compliance: Hard Rules (v2.1.1 live → v2.2)
Owner: Legal & Compliance (07) · Updated Tue Nov 10, 2026 (after the team meeting) · Not legal advice. **No attorney has reviewed this (TM-6). Legal still recommends one before any minor signs.**
Source of truth: Approach project → `legal/compliance-v2.1.md`. `legal/data-requirements.md` holds the long-range rules for a public launch. This file is the subset that applies **now**. Every MUST is tested. Sections marked **v2.2** are new for Product's `product/specs/v2.2.md` (pass 1 unless noted).

**Changes on 11/10:**
- **C17:** reverted to the coach-recorded form v2. Digital form v3 is parked at `legal/future/parent-consent-form-v3.md` and isn't in v2.2.
- **C13:** contact email filled in.
- **C11:** touch-height exception.
- **C12:** retention fix (proposal).
- The district-user rule is replaced, and TM-5 and TM-6 are logged as accepted risks.
- **Reviews:** `team_members.level` (§ Level) and multi-team visibility (§ Multiple teams).

Contact email for all legal pages and the form: **Ryan@thehbcvbc.com** (FA-3). C18 is still open: Branding recommends moving to an Approach domain.

## Age
- MUST: neutral month/year-of-birth gate before anything else; under 13 blocked; nothing stored but a local block flag.
- MUST: coaches 18+.
- MUST: store birth year + is_minor only, never the full date.
- MUST: on actual knowledge of an under-13 user, delete the account (use `delete_my_account` or the admin equivalent) within 72 hours.

## Minors and consent (form v2, coach-recorded)
- MUST: a minor on a team can't send workout logs or check-ins until the coach records parent consent from a **signed form v2**. Enforced by RLS, not only by the UI.
- MUST: athletes can't change their own consent status.
- MUST: consent is **per team** (`team_members` row). A form names one team and one coach; a second team needs its own form (see § Multiple teams).
- MUST NOT (v2.2): digital or emailed parent signing, parent email collection, or an email vendor. These are parked with form v3.

## Data
- MUST NOT collect: free-text injury/pain notes, full birth dates, location, photos/video, contacts, HealthKit/wearable data, advertising IDs.
- MUST keep on the device only: body weight, fuel targets, solo-mode data, and **touch height outside testing days** (see the C11 exception).
- MUST: any new server-side field gets a Legal review before it's built.

### C11 exception: touch height from testing days (v2.2 P1, documents what's built)
- **Allowed on the server:** the **approach touch** result entered during a team **testing day**, stored in `test_results` like the other jump tests. It requires `c_testing` (box 6) for minors, or the testing toggle for adults. Box 6 and the Privacy Notice already cover "jump test results."
- **Who sees it:** the athlete and their current coach see the raw value. Boards show **change only**, never the value (D-021).
- **Still device-only:** touch entries the athlete logs outside a testing day, standing reach, and all solo-mode jump tests. A server testing-day value may also be copied into the athlete's local touch log (that's fine). Local-only values must never be uploaded.
- **Acceptance:** a touch entered from Progress (not a testing day) creates no server row (network check). A testing-day touch without `c_testing` is rejected by RLS.

## Visibility
- MUST: athlete data is visible only to the athlete and their **current** coach. Never teammates.
- MUST: removing an athlete cuts the coach's access to their logs and check-ins immediately.
- MUST NOT: messaging, comments, feeds, public profiles. (Team effort boards are allowed only under the Boards rules below.)

## Permissions (pass 2)
- MUST: six per-athlete permissions (participation, check-ins, share check-ins, boards, attendance, testing). Each feature works for a minor only when the coach has recorded that box from a signed form v2; adults choose for themselves. Enforced by RLS.
- MUST: athletes under 18 can't change their own permissions; adults can, anytime, in Settings → Privacy.

## Boards (pass 2)
- MUST: boards show "First L." or initials only, never a full last name; athletes can hide.
- MUST NOT show on any board: weights/loads, strength-check results, estimated maxes, check-ins or pain, body weight, nutrition, **experience level**.
- MUST: the coach board is visible only to the signed-in coach of that team; no public links.
- MUST: effort metrics count only prescribed sessions; hours capped (3 h/day, 15 h/week); rest days never break streaks.

## Testing days (pass 2)
- MUST NOT: true 1-rep-max tests, or "max out" / "your max" wording.
- MUST: load tests locked until the coach confirms supervision that day; record who and when.
- MUST: load tests only for coached intermediate/advanced athletes with testing permission, not within 48 h before a match **on any of the athlete's teams**, and not when the athlete reports pain or is run down that day.
- MUST (v2.2): for minors, load-test eligibility uses a **coach-confirmed** level only (see § Level).
- MUST: estimated strength is always labeled an estimate and is visible only to the athlete and coach.

## Fuel (pass 2)
- MUST NOT: calorie numbers, gram or g/kg targets, weight goals, supplement advice, or body weight used for nutrition.

## Third parties
- MUST NOT: ad SDKs, analytics that share data for the vendor's own use, tracking pixels (app, web pages, or emails), App Tracking Transparency.
- Allowed vendors now: Supabase, GitHub Pages. Adding any vendor needs a Legal review.

## Deletion and retention
- MUST: in-app account deletion for athletes and coaches. Deleted data is removed within 30 days.

### C12 retention fix (v2.2 P1: proposal for Product and Claude Code)
**Problem:** the Privacy Notice and consent form promise to keep consent and supervision records for 5 years. But consent lives on `team_members`, and supervision on `test_sessions`. Both are wiped by `on delete cascade` when an athlete or coach deletes their account or a team. So the promise is broken today, and the record that matters most after an injury (that a parent consented and a coach supervised) disappears.

**Proposed fix:** write a minimal **proof record** at the moment of the event, in tables with **no foreign keys**, so deletions can't cascade into them.
1. **`consent_archive`**, one row each time a coach records or changes consent:
   - `athlete_user_id` (plain uuid, no FK), athlete name as shown to the coach, birth year
   - `team_id` (plain uuid), team name, `coach_user_id`, coach name
   - `consent_version`, the six box values, `recorded_at`
   - `account_closed_at` (null until closed), `purge_after` (null until closed)
2. **`supervision_archive`**, one row per coach supervision confirmation:
   - `team_id`, team name, `coach_user_id`, coach name, `day`, `battery`, `confirmed_at`
   - the list of athlete user ids and names who entered a load-test result in that session
   - **no weights, reps, results, or estimates**
   - `account_closed_at`, `purge_after`
3. **On deletion:** `delete_my_account()` and team deletion **don't** delete archive rows. They set `account_closed_at = now()` and `purge_after = now() + interval '5 years'` on rows for that user or team. Then the normal cascade removes everything else.
4. **Purge:** a monthly scheduled job (Supabase `pg_cron`) deletes rows where `purge_after < now()`.
5. **Access:** RLS enabled with **no policies** for `anon` or `authenticated`. Only the service role (founder, for legal or support requests) can read. Never shown in the app.
6. **Backfill:** a migration copies current consent (all `team_members` rows with `consent_recorded_at`) and all `test_sessions` into the archives.
7. **Copy:** the delete-account dialog adds: "We keep a short record of parent consent and coach supervision for 5 years, with no workout, check-in, or test results, as our Privacy Notice explains."
8. **Acceptance:**
   - Delete an athlete who has consent plus one supervised test: the archive rows remain, with `purge_after` set, and no result values exist anywhere.
   - Delete a coach: the supervision rows remain.
   - An authenticated user can't select from either archive (API test).
   - The purge job removes a row with a past `purge_after`.

*Why not just stop promising retention:* without the record, there's no proof a parent consented or a coach supervised. Keeping a minimal record for proof is a normal exception to deletion. Attorney to confirm the 5-year period.

## Copy
- MUST NOT: medical, injury-prevention, treatment, or guaranteed-results claims anywhere users can see.
- MUST: App Store privacy labels (when that happens in 2027) list what's actually collected. Never "Data Not Collected" while sync is on.

## Founder and district rules (replaces "no district users," TM-5)
The soft-launch team may come from the founder's own district (TM-5). These rules reduce, but don't remove, the R1 risk:
- MUST: build, run, and support Approach only on **personal time, personal devices, personal networks, and personal or business accounts**. Never district email, Drive, laptops, or Wi-Fi.
- MUST: no **coach board** on district-owned screens, projectors, or networks. The coach uses a personal device and a personal hotspot (or none) until the attorney says otherwise.
- MUST: before the first minor's form is recorded, the district coach confirms in writing that their school or athletic department allows them to use Approach with the team (Terms §4). Keep that confirmation with the consent records.
- MUST: no district logos, mascots, or artwork in Approach, demos, or marketing (D-023 R1 note). Team logos stay out of v2.2 until Legal and Branding sign off.
- MUST: the founder never uses access to district records (rosters, grades, health or eligibility files) to recruit or support Approach users. Athletes join only through the coach's team code.
- SHOULD: the founder doesn't coach the soft-launch team himself, and isn't its coach's supervisor.

## Accepted risks (founder decisions, logged by Legal)
| Ref | Decision | Risk Legal recorded | Mitigations in place | Legal recommends |
|---|---|---|---|---|
| **TM-5** (11/10) | Soft-launch team from Ryan's own district | **R1 is now live:** possible district claim on Approach's IP; outside-employment and conflict-of-interest policy exposure; a public-school coach using the app with students may bring in FERPA, SOPIPA, and district app-approval rules (attorney Q17). | Founder and district rules above; coach's written school approval; consent per team; no student records used. | Get the district policy and IP check from an attorney before any minor signs. |
| **TM-6** (11/10) | No attorney or CSCS gate before the first minor; load tests stay live with the supervision lock | Unreviewed consent form, notice, and Terms; no entity, so the founder is personally liable; strength checks on minors without a CSCS protocol review (R6; Training Content's disagreement recorded twice). | Supervision lock, eligibility rules, no 1RM, coach-confirmed level for load tests, C12 proof records. | An attorney consult (~$1K, Finance shows it as "deferred"), entity formation, and insurance before the first minor. Turn off load tests for minors until CSCS review. |

---

## Review: `team_members.level` (T2 / G8; for Product's v2.2 spec)
**Verdict: approved as a server-side field, with the conditions below.** It's training data about a minor, not health data. It's covered by consent box 1 (form v2 now lists it) and by the adult's account terms. The Privacy Notice now lists it.

1. **Field:** `team_members.level smallint` (1–3, nullable), plus `level_set_by uuid` and `level_set_at timestamptz`. Who set the level and when matters, because level gates load tests.
2. **Default:** the athlete's self-reported experience when they join, with `level_set_by = null` (meaning "self-reported, not confirmed").
3. **Load-test gate (safety):** for **minors**, strength checks require a **coach-confirmed** level of intermediate or advanced (`level_set_by` = that team's coach). A self-reported "advanced" never unlocks load tests by itself. The coach roster shows "Level not confirmed" until the coach sets it. Exercise resolution (G8) may use the self-reported default.
4. **Who can write:** only that team's coach (RLS). Athletes can't change it.
5. **Who can see:** the athlete (shown in Settings or Program as "Your level on [team]: Intermediate (set by your coach)") and that team's coach. **Never** teammates, boards, ticker, rack labels, or other teams' coaches.
6. **Uses allowed:** G8 exercise resolution, load-test eligibility, rack auto-assign (D-026: "by experience" racks keep shuffled numbers, and levels never show). **Not allowed:** ranking, points, board grouping labels, or anything visible to teammates.
7. **Retention:** deleted with the team membership. Carrying it into solo mode at season end (I3) is the athlete's choice, copied to their own profile.
8. **Two teams with different levels (TM-2):** use the level from the team whose **lift program the athlete is following**. → **Training Content (02)** to confirm, or say whether the lower of the two should always win for safety.
9. **Acceptance:**
   - An athlete can't update `level` (API test).
   - A minor with self-reported "advanced" and no coach confirmation sees no strength check on a testing day.
   - Level never appears in `live_progress` or any board payload (schema check).

## Review: multiple teams (TM-2; for Product's v2.2 spec)
**Verdict: approved, with these visibility rules.** The one-lift-program rule is fine from a legal view. The risk is **leaking one team's data to the other team's coach**, often a school coach and a club coach, which is exactly the R1 and C18 boundary.

1. **Consent is per team.** Each `team_members` row has its own six flags from its own form. Team B's coach gets nothing from Team A's form. A minor can follow Team A's program and log while Team B is still "Consent needed." Team B's features stay off for that athlete until Team B's form is recorded.
2. **Each coach sees only their own team's context:**
   - their own team's calendar events (never the other team's events, opponents, or locations);
   - workout logs created while following **their** team's program;
   - check-ins only if **their** row has share-check-ins (box 3);
   - test results entered on **their** team's testing days;
   - attendance for **their** team's practices and matches.
3. **The non-active team's coach** sees only "Following another team's lift program": no team name, coach name, or program details. They still see their own team's attendance and the athlete's board presence, per their own consent flags.
4. **Combined schedule (athlete only):** the athlete's app combines both teams' practices, matches, and tournaments. Caps, match-day, and 48-hour testing rules check against all of them.
   - When a rule moves or blocks something, the coach sees a **neutral reason** ("Moved: schedule conflict," "Not eligible for testing today"), never "match with [other team]."
5. **History belongs to the athlete (I2):** progression and weight suggestions may use all of the athlete's own logs and tests internally. **A coach never sees another team's raw history**, including when an athlete switches active programs. The new coach sees only data created under their program from the switch onward, plus the resulting weight suggestions.
6. **Boards:** a team's boards count only sessions from **that team's** program and that team's attendance, under that team's box 4 and box 5. The non-active team can show the athlete as "Following another team's program" or leave them off its Sessions, Consistency, and Overall lists. → **Product (01)** decides which (Overall fairness, TM-4). Either is fine legally, as long as no other-team data appears.
7. **Leaving a team:** removing the athlete from Team B ends Coach B's access immediately (existing rule) and never affects Team A.
8. **Acceptance:**
   - Coach B can't read logs, check-ins, tests, or calendar events from Team A for a shared athlete (API tests).
   - Coach B's roster shows "Following another team's lift program" with no team name.
   - A minor with Team A consent and Team B pending can log on A's program, and nothing is written for Team B.
   - Neutral reasons appear on the coach side for cross-team conflicts.

---

## Still open for Legal (from the 11/10 action items)
- T5–T7 wording (copy fixes, G3 pain message, G4 head-injury line)
- Rack-partner names under consent box 4 (D-026)
- Refreshing the attorney packet: context, district team, G6/I6, Q17
