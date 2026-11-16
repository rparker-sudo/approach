# Compliance: Hard Rules (v2.2 live → 2.2.1 + marketing site → 2.3.0 trainer mode)
Owner: Legal & Compliance (07) · Updated Sun Nov 15, 2026 (§ Trainer mode for 2.3.0) · Not legal advice. **No attorney has reviewed this (TM-6). Legal still recommends one before any minor signs, and before the trainer's first client.**
Source of truth: Approach project → `legal/compliance-v2.1.md`. `legal/data-requirements.md` holds the long-range rules for a public launch. This file is the subset that applies **now**. Every MUST is tested. Sections marked **v2.2** are new for Product's `product/specs/v2.2.md` (pass 1 unless noted).

**Changes on 11/10:**
- **C17:** reverted to the coach-recorded form v2. Digital form v3 is parked at `legal/future/parent-consent-form-v3.md` and isn't in v2.2.
- **C13:** contact email filled in.
- **C11:** touch-height exception.
- **C12:** retention fix (proposal).
- The district-user rule is replaced, and TM-5 and TM-6 are logged as accepted risks.
- **Reviews:** `team_members.level` (§ Level) and multi-team visibility (§ Multiple teams).

**Changes on 11/13:**
- TM-8 and TM-9 logged as accepted risks.
- The "founder doesn't coach the soft-launch team" rule is replaced by founder-as-coach rules.
- AD/principal approval request drafted (`legal/ad-approval-request.md`).
- **B5 closed:** rack-partner names approved under box 4.
- Wording and field sign-offs for v2.2 are in `legal/v2.2-copy-review.md`.

**Changes on 11/14:**
- **C13/C18 closed:** contact email is `ryan@approachstrength.com`.
- Zoho reviewed (§ Third parties).
- Live legal pages checked against the source (§ Live page check).
- TM-13 coach clause written (Terms §4, in `legal/soft-launch-notice.md`), and R11 logged for outside coaches.
- § Marketing site rules (TM-15, TM-16).
- J1–J3 build rulings.
- **Name:** "Approach Strength" (TM-14) in all user-facing legal text.

**Changes on 11/14 (hand-off session with Ryan):**
- **R12 accepted:** Branding's check found a federal conflict; Ryan keeps the name and publishes the marketing site now (§ Accepted risks).
- **Zoho plan recorded:** paid trial now, reverting to Free when it ends (§ Third parties).
- **§ Age wording updated** for UX F1 v3.2 (age question on sign-up only, never on log-in). Approved.
- **Marketing-site copy signed off** (`docs/copy/website-copy.md` v1.1, with Legal's edits).
- § Level item 8 updated to D-031 (lower level), closing C20 for this file.

**Changes on 11/15 (T-A2 / T-B4, no AI part):**
- **§ Trainer mode** for 2.3.0: adults only, the TM-19 gate, new fields approved, consumer health data rules for adult clients, **no AI in 2.3.0** (TM-18), no co-branding at the gym, and accepted risks TM-17, TM-19, and R11 for adult clients.
- Trainer Terms (§4T) and the adult-client privacy section (Part A2) are in `legal/soft-launch-notice.md`.

**Contact email for all legal pages, the consent form, and the AD letter: `ryan@approachstrength.com`** (TM-10, D-033). The club address `Ryan@thehbcvbc.com` must not appear anywhere users can see. **C13 and C18 closed.**
- MUST (2.2.1): legal pages are generated **only** from Legal's text in `docs/legal/`. Remove the build script's find-and-replace of the email (build review §5). No build step may edit legal wording.
- **Public name: "Approach Strength"** (TM-14) in every user-facing legal page, form, and letter. Branding's trademark check found a conflict (R12); **Ryan accepted the risk on 11/14** and keeps the name. ™ at most, never ®.

## Age
- MUST: a neutral month/year-of-birth question **before any account or on-device profile is created and before any data is collected** (no email, name, role, or anything else first). Under 13 blocked; nothing stored but a local block flag.
- MUST (2.2.1, UX F1 v3.2): logging in to an **existing** account never asks the age question; the account already has `birth_year` and `is_minor`. A pre-2.1 account with no birth year answers it once after log-in, before anything else in the app; under 13 → signed out and deletion requested.
- MUST: the local block flag also hides **Log in** on that device, and the block screen survives reloads.
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
- Allowed vendors now: **Supabase, GitHub Pages, Zoho Mail** (approved 11/14, below). Adding any vendor needs a Legal review. **No AI provider is approved** (§ Trainer mode, TM-18).

### Zoho Mail review (mailbox for `ryan@approachstrength.com`)
**Verdict: approved for the contact mailbox, on either plan, with the conditions below. Legal recommends Mail Lite.** Plan (Ryan, 11/14): **paid-plan trial now; it reverts to Mail Free when the trial ends.** Legal's view on the record: Lite is still recommended (~$12/yr). Sign the DPA **during the trial**, and confirm it stays in force on Free; if it doesn't, that's the reason to keep Lite.

*What this mailbox will hold:* parent and user emails, deletion and privacy requests, **scans or photos of signed consent forms** (the coach note on form v2 says to email copies here), and from 11/15 the **trainer's TM-19 confirmation** (certification, insurance, own business). That makes it a store of minors' personal information and of the C12 proof records, not just a contact address.

| Check | Finding (Zoho's own pages, 11/14) | OK? |
|---|---|---|
| Ads or selling data | "We will never serve you ads, nor sell your data to third party vendors," including free versions | ✅ |
| Data location | Accounts on zoho.com are stored in Zoho's US data center (verify in the account profile) | ✅ |
| Data processing terms | Zoho offers a DPA that admins sign electronically; whether it covers the Free plan isn't stated | ⚠️ Sign it during the trial; confirm it covers Free |
| Free plan | Up to 5 users, 5 GB each, one domain, **webmail and Zoho apps only (no IMAP/POP/ActiveSync)**; support terms not stated | ⚠️ Usable |
| Mail Lite | About US$1/user/month billed yearly (5 GB) or $1.25 (10 GB); adds desktop and mail-app access | ✅ |

**Why Lite:** the mailbox has to keep signed consent copies for 5 years after an account closes (C12). A paid plan gives clearer contract terms and support, and avoids any risk of a free account being limited or closed for inactivity (check Zoho's free-plan terms if staying on Free).

**Conditions (either plan; Ryan hasn't confirmed 1–3 yet):**
1. Turn on **two-factor sign-in** for the Zoho admin and mailbox. Use a strong unique password, stored outside district systems.
2. **Sign Zoho's DPA** from the admin console (or request it from Zoho legal) and save a copy with the Legal records.
3. **No auto-forwarding** to any other address, especially district or club email. Read it only on personal devices.
4. Make a folder or label "Consent records" for form scans. Never delete those before 5 years after the athlete's account closes. Delete other personal emails (e.g., finished deletion requests) after 12 months. Keep the trainer's TM-19 email in a "Trainer records" folder (§ Trainer mode).
5. Don't connect third-party add-ons or "AI assistants" that read mailbox content unless Legal reviews them (e.g., leave Zia off for consent-record mail if possible).
6. The Privacy Notice lists **Zoho Mail (our email)** under service providers. Done in the notice.

## Deletion and retention
- MUST: in-app account deletion for athletes and coaches. Deleted data is removed within 30 days.

### C12 retention fix (v2.2 P1: built in 2.2.0)
**Problem:** the Privacy Notice and consent form promise to keep consent and supervision records for 5 years. But consent lives on `team_members`, and supervision on `test_sessions`. Both are wiped by `on delete cascade` when an athlete or coach deletes their account or a team.

**Fix:** write a minimal **proof record** at the moment of the event, in tables with **no foreign keys**, so deletions can't cascade into them.
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
- MUST: build, run, and support Approach Strength only on **personal time, personal devices, personal networks, and personal or business accounts**. Never district email, Drive, laptops, or Wi-Fi.
- MUST: no **coach board** on district-owned screens, projectors, or networks. The coach uses a personal device and a personal hotspot (or none) until the attorney says otherwise.
- MUST: before the first minor's form is recorded, the district coach confirms in writing that their school or athletic department allows them to use Approach Strength with the team (Terms §4). **Since Ryan is the coach (TM-9), this means a signed approval from Ryan's own AD or principal**, using `legal/ad-approval-request.md`, ideally answering whether the coaching counts as part of his duties. Keep it with the consent records. A "needs ed-tech/privacy review" answer means **no minors until that review is done.**
- MUST: no district logos, mascots, or artwork in Approach Strength, demos, or marketing (D-023 R1 note). Team logos stay out of v2.2 until Legal and Branding sign off.
- MUST: the founder never uses access to district records (rosters, grades, health or eligibility files) to recruit or support Approach Strength users. Athletes join only through the coach's team code.
- ~~SHOULD: the founder doesn't coach the soft-launch team himself.~~ **Reversed by TM-9 (11/13): Ryan coaches it.** Replaced by these founder-as-coach rules:
  - MUST: as coach, Ryan sees his athletes only through the **coach view**, like any coach. He doesn't use owner or admin access (Supabase dashboard, service role, SQL) to look at his own athletes' data, except to fix a bug, answer a deletion or legal request, or meet a legal duty. Log each such access (date, reason) in a private note.
  - MUST: owner/admin work on Approach Strength (code, database, vendor accounts) happens on personal time and devices, never during contract hours or on district networks, even when it's about his own team.
  - MUST: consent forms Ryan collects as coach go through the normal flow: record exactly the boxes checked, and keep the signed copies off district systems.
  - MUST: pilot **feedback** comes from coaches (TM-9b). Ryan doesn't run research interviews with his own athletes or their parents. Another adult does, with the research consent form (Market Research).

## Accepted risks (founder decisions, logged by Legal)
| Ref | Decision | Risk Legal recorded | Mitigations in place | Legal recommends |
|---|---|---|---|---|
| **TM-5** (11/10) | Soft-launch team from Ryan's own district | **R1 is now live:** possible district claim on the app's IP; outside-employment and conflict-of-interest policy exposure; a public-school coach using the app with students may bring in FERPA, SOPIPA, and district app-approval rules (attorney Q17). | Founder and district rules above; coach's written school approval; consent per team; no student records used. | Get the district policy and IP check from an attorney before any minor signs. |
| **TM-6** (11/10) | No attorney or CSCS gate before the first minor; load tests stay live with the supervision lock | Unreviewed consent form, notice, and Terms; no entity, so the founder is personally liable; strength checks on minors without a CSCS protocol review (R6; Training Content's disagreement recorded twice). | Supervision lock, eligibility rules, no 1RM, coach-confirmed level for load tests, C12 proof records. | An attorney consult (~$1K, Finance shows it as "deferred"), entity formation, and insurance before the first minor. Turn off load tests for minors until CSCS review. |
| **TM-8** (11/13) | No insurance, LLC, or quote gate before the first minor. Ryan: Approach is "just the vehicle" for programming he already does as coach | **Personal liability:** Ryan's role as the app's **owner** (the product's load and level logic, minors' data in his own Supabase account) is private business, likely outside district defense (Gov. Code §825 covers only acts within his job). With no entity, a claim about the product reaches personal assets. No general liability coverage (~$444/yr per Finance). Personal homeowner's or umbrella policies often exclude business activities. | Supervision lock, eligibility and level rules, no 1RM, G2/G5 caps, C12 proof records, coach-only load tests, the AD letter separating coaching from product. | Free quotes first (Finance drafts are ready). Then general liability coverage and an attorney consult before the first minor. Ask a broker whether a personal umbrella covers anything. Form an LLC (with a CPA) before outside coaches join. Training suggests load tests adult-only during the pilot (not adopted). |
| **TM-9** (11/13) | Ryan coaches the soft-launch team himself | **R1 at its strongest:** a district employee using his own app with his own students, as both coach and owner. It raises the district IP claim (Q1), outside-business disclosure (Q2), FERPA/SOPIPA and district app review (Q17), and mandated-reporter duties through the app (Q4). His team can't validate the product (Market Research). | Founder-as-coach rules above; written AD/principal approval that separates coaching from the product; full disclosure of ownership; no district records, devices, or networks; feedback from outside coaches. | Send the AD letter (attorney review first if possible). No minors until it's signed, and until any district ed-tech review it requires is done. |
| **R12 / TM-14** (11/14) | Keep "Approach Strength" and **publish the marketing site now** despite Branding's finding | A live, allowed federal application for **APPROACH** (Serial 97166472, Fullsteam, Class 42: workout scheduling and member software for sport clubs). "Strength" is descriptive, so the marks may be compared on "APPROACH." A public site with prices is public use in commerce, which raises the chance of a demand letter. A forced rename after families sign means re-collecting consent forms and reprinting. | ™ only, never ®; no filing; no paid ads, merch, or signage; a plain site with no sales; the bundle ID isn't locked yet. | A trademark attorney's opinion (free clinic/SBDC or flat fee) **before the App Store listing, any paid promotion, or the first outside coach's forms**. Branding recommended one before forms print. |
| **TM-17 / TM-19 / R11-T** (11/15) | Trainer mode Phase A + B built and launched in one day as 2.3.0; the trainer's first clients this week. Gate = option B (trainer's written confirmation of certification, own professional liability insurance, own business), not C (also Ryan's GL quote and an attorney consult) | **Adult clients' consumer health data** (check-ins with a pain flag) in Ryan's Supabase, with no entity or insurance (R11 extended). Trainer Terms, this section, and Training's adult rules are **unreviewed** by an attorney or a CSCS. A gym is inside Fullsteam's APPROACH goods description (R12). One trainer is a sample of one. | Adults only; TM-19 gate enforced in the database; Trainer Terms §4T with indemnity backed by **her own** professional liability insurance; health-data opt-ins default off; no condition fields; no AI; no co-branding; private pilot. | Option C: Ryan's GL quote and a short attorney consult before the first client. At minimum, ask the trainer for her insurer's name and policy expiry date, and re-confirm at expiry. |

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
8. **Two teams with different levels (TM-2):** **settled by D-031:** exercise resolution uses the **lower** of the athlete's levels across teams. Minor load tests need the testing team's coach-confirmed level ≥ 2 **and** no other team's coach has set level 1. No coach sees another team's level (copy review §4; J1 in 2.2.1).
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
6. **Boards:** a team's boards count only sessions from **that team's** program and that team's attendance, under that team's box 4 and box 5. Product chose (D-027) to leave the athlete off the non-active team's Sessions, Consistency, Streak, Overall, and live board. No other-team data appears.
7. **Leaving a team:** removing the athlete from Team B ends Coach B's access immediately (existing rule) and never affects Team A.
8. **Acceptance:**
   - Coach B can't read logs, check-ins, tests, or calendar events from Team A for a shared athlete (API tests).
   - Coach B's roster shows "Following another team's lift program" with no team name.
   - A minor with Team A consent and Team B pending can log on A's program, and nothing is written for Team B.
   - Neutral reasons appear on the coach side for cross-team conflicts.

---

## Review: rack-partner names (B5, D-026 R5; pass 2)
**Verdict: approved under consent box 4, with conditions. The count-only fallback is no longer needed.**
*Why it's covered:* box 4 lets teammates see the athlete's board name and workout progress on the live board, and the live board already shows tiles grouped under rack headers (R4). A teammate's "You're on Rack 2 with Jordan M." card reveals nothing the board doesn't already show to the same audience. Form v2 and the notice now say so explicitly, which was added before any family signed.

1. **Shown by name only** if the partner has board consent (`c_boards`: box 4 for minors, the boards toggle for adults) **and** isn't set to Hidden, using the partner's own board-name setting ("Jordan M." or initials). Everyone else shows as "1 more teammate" / "2 more teammates."
2. **Never in the card:** level, position, the auto-assign method, full last names, or anything about why someone is in that rack.
3. An athlete **always** sees their own rack, even without box 4 (it's their own information, box 1). They see partners' names under the partners' consent, not their own.
4. Only current members of **that** team see the card. Other teams' coaches never see rack membership (§ Multiple teams).
5. **"By experience" racks:** teammates can guess who's newer from who's grouped together. That's acceptable, because level isn't health data and isn't displayed. But the Racks setup helper should say: "Grouping by experience can show who's newer. Balanced mix is the default." → **UX (03)** to add to the Racks screen; Product to confirm balanced mix as the default method.
6. **Acceptance:**
   - A partner without box 4, or set to Hidden, appears only in the count (API check of the card payload: no name field).
   - The rack card payload contains no level, position, or method.
   - An athlete without box 4 still sees their own rack.

## Live page check (11/14): `approachstrength.com/privacy`, `/terms`, `/consent`
Checked against Legal's source text. **Full word-for-word comparison wasn't possible from the planning chat**, so this is a structural check plus 13 targeted clauses. **The real fix is mechanical:** once the 2.2.1 build generates pages only from `docs/legal/` (no regex), an acceptance check compares each page's text to its source file (normalize whitespace, then compare).

| Item | Live | Source | Result |
|---|---|---|---|
| Contact email (all three pages) | `ryan@approachstrength.com` | `ryan@approachstrength.com` | ✅ |
| Touch height outside testing days, device-only (C11) | Present | Present | ✅ |
| "More than one team… each team's coach needs their own form" | Present | Present | ✅ |
| Experience level row; one-team line; 5-year proof record (form) | Present | Present | ✅ |
| Terms §7, no signing a form for someone else | Present | Present | ✅ |
| **Rack groups and rack-partner names (B5, 11/13)** in the notice and form box 4 | **Missing** | Added 11/13 | ❌ No minor has signed, so nothing to re-collect. Ships in 2.2.1 |
| Name | "Approach" | "Approach Strength" | ❌ 2.2.1 (TM-14), **before the first form is printed** |
| Coach clause (TM-13), Zoho as a provider, marketing-site line | Not yet | Added 11/14 | ❌ 2.2.1 |

**Conclusion:** the live pages are the 11/10 text plus the email swap. No form may be printed from the current live `/consent` page until 2.2.1 ships.

## Build rulings J1–J3 (from `claude/build-review-2.2.md` §6)
- **J1, `member_levels.swap_level` (a number) readable by the coach through the API: not allowed.** It breaks copy review §4.1 ("no coach ever learns another team's level exists"). **2.2.1:** return only the swap list ("Adjusted for this athlete" items), with no level value and no flag saying another team caused it.
- **J2, new table `station_runs`: approved after the fact.** It holds team-level rotation timing with no athlete data. Conditions: no user ids other than the coach's; RLS limited to that team's coach and members; deleted with the team. *Process note:* it was added without a review (rule G-5). Future builds must stop for Legal on any new table.
- **J3, `team_effort.ranked` visible to teammates: not allowed as built.** It tells minors that a teammate follows another team's program. **2.2.1:** the teammate-facing payload contains **only ranked rows**. Unranked athletes are left out, with no flag and no reason. The coach's own view may show "Following another team's program" (already allowed).

## Outside coaches (TM-13) and R11
**Rules before an outside coach records any minor's consent form:**
- MUST: the coach accepts the **Coach Terms** (Terms §4) at coach sign-up with a separate checkbox. Store `coach_terms_version` and `coach_terms_accepted_at` on the coach's profile (**new fields, approved by Legal for this purpose**). Existing coach accounts must accept before recording consent or confirming supervision. **Built in 2.2.1 §8.**
- MUST: the coach's **own written approval** from their school (AD/principal) or club director, kept by the coach. Approach Strength asks for a copy (email it to `ryan@approachstrength.com`) **before** that team's first minor's form is recorded. Ryan logs the date received.
- MUST: everything in § Founder and district rules about screens, networks, and records applies to every coach through Terms §4.
- SHOULD (Training): no strength checks for outside coaches' minors until a CSCS reviews the protocol. *(Not adopted; recorded.)*

| Ref | Decision | Risk Legal recorded | Mitigations | Legal recommends |
|---|---|---|---|---|
| **R11 / TM-13** (11/14) | Outside coaches may run real blocks with minors once the coach clause is live and the coach has school/club approval. No insurance step | **Other people's minors** go into Ryan's Supabase under Ryan's product logic, with no entity or insurance. TM-8's "just the vehicle" reasoning doesn't reach outside coaches' athletes. The coach clause shifts responsibility on paper only: a coach's indemnity is worth what the coach can pay, many school employees can't or won't sign one, and a minor's claims may survive a parent's release (attorney Q8). | Coach Terms with responsibilities and indemnity; written approval per coach; supervision lock; eligibility and level rules; C12 proof records; incident reporting by coaches. | **Before the first outside coach's minor:** general liability coverage (~$444/yr, Finance), an LLC, and an attorney consult on the coach clause. Training: CSCS review before outside coaches run strength checks. |

## Marketing site rules (`approachstrength.com`, TM-15, TM-16)
Applies to the apex site and any page outside `app.`. **Legal signed off `docs/copy/website-copy.md` v1.1 on 11/14** (with Legal's edits to the Testing days row and the Safety page). Any later wording change needs Legal again.

**Data and tracking**
- MUST NOT: analytics, pixels, tag managers, chat widgets, heatmaps, A/B testing tools, or embedded social or video players (YouTube, Instagram). Links out are fine.
- MUST: **no cookies** and no local storage on the marketing site. Self-host fonts (no Google Fonts or other font CDNs, which log visitor IPs). No JavaScript.
- MUST NOT: sign-up, waitlist, contact, newsletter, or demo-request **forms**, or **buy, checkout, or "start trial" buttons**, unless Legal reviews them first. Contact is a plain `mailto:ryan@approachstrength.com` link.
- MUST: sign-in happens only on `app.` The marketing page has **Coach** and **Athlete** buttons that link to `app.` sign-in, and an **Administrator** button that opens the fake-data preview.
- MUST: the footer links Privacy, Terms, and Parent consent form at their **current URLs** (`/privacy`, `/terms`, `/consent`). They never move, because printed forms point to them. The Privacy Notice states that the marketing site sets no cookies and uses no analytics.
- MUST (2.3.0): the footer also links **"Consumer health data"** to `/privacy#health-data` (the consumer health data section in Part A2). Washington's My Health My Data Act expects a separate, prominent homepage link. Attorney to confirm whether a section is enough or a separate page is needed (Q24c).

**Who it speaks to**
- MUST: written for **coaches, athletic directors, and parents.** The athlete section addresses parents ("for your athlete"), not minors. No calls to action aimed at teens.
- MUST NOT: photos or video of real athletes, teams, schools, or the founder's district. No school or club names, logos, mascots, or colors. Demo-mode screenshots with fake data, or licensed stock/illustrations with no identifiable minors.
- MUST NOT: testimonials, quotes, ratings, star counts, user numbers, or "trusted by" logos unless they're real, the person agreed in writing, and Legal has reviewed them. **Nothing invented or "representative,"** and nothing from minors.
- MUST NOT (private pilot, R12): any trainer or gym section, tier, or mention of trainer mode until the name question is settled (spec trainer-mode Rules).

**Claims**
- MUST NOT: injury-prevention, treatment, medical, or guaranteed-results claims ("prevent ACL tears," "add 4 inches to your vertical," "safe for all ages"). No "proven," "science-backed," "clinically," or "#1" unless a cited source supports the exact claim and Legal approves it.
- MUST NOT: comparisons naming competitors (Volt, TeamBuildr, TrainHeroic, etc.) or their prices.
- MUST: strength checks are described as supervised rep-max tests with coach confirmation. Never "max testing" or "1RM."
- MUST: other sports in previews are labeled "Example: volleyball today, more sports later" (Training).
- MUST: when the site describes boards, it says jump-test improvement can appear **with parent permission**, and strength-check results never do.

**Feature previews (TM-15)**
- MUST: every feature has a label next to it: **Live**, **Coming soon** (roadmap Next), or **Later.** Unbuilt features have no image (UX U2) or a "Preview" tag. Screenshots come only from demo mode with fake names and data.
- MUST NOT show: AI-generated programs, chat or social feeds, true 1RM testing for minors, personalized nutrition, public lift numbers, or heart-rate data presented as available.
- MUST: the **Administrator preview** uses only fake data, labeled "Sample data. Coming soon." It must not suggest Approach Strength is offered to schools or districts now (D-006), shows team totals only, and collects nothing.

**Pricing (TM-16)**
- MUST: next to **every** price: "Planned price. May change. Free during the pilot." No buy buttons, no "reserve this price," and no deadline or scarcity language.
- MUST: the Organization tier is labeled **Later**. Athlete and parent prices are addressed to parents. Don't say who pays first until Finance and Product decide.
- Legal's view on the record: dollar amounts for unbuilt tiers are allowed with these labels. Change them only with a dated note.

**Name and marks**
- MUST: "Approach Strength" as the name, with **™** at most, **never ®**, until a registration is granted. The footer says "© 2026 Ryan Parker" until an entity exists (then the entity's name).

**Acceptance (marketing site)**
- The page makes no third-party requests (browser network panel: only `approachstrength.com`).
- No cookies are set.
- No forms, `<input>`, or buy buttons exist; no `<script>` tags.
- Every price has the label, and every feature has a status label.
- The legal links work, including "Consumer health data" (2.3.0).
- The claim-word search is clean.
- The published text matches `docs/copy/website-copy.md` v1.1 (Legal's signed-off copy).

---

## Trainer mode (2.3.0: general teams, adult clients; T-A2 / T-B4, no AI)
Applies to teams with `teams.kind = 'general'` (spec `product/specs/trainer-mode.md` v0.3). **Volleyball teams don't change:** every rule above still applies to them exactly as written. Wording for users is in `legal/soft-launch-notice.md`: **Terms §4T** (Trainer Terms) and **Privacy Part A2** (adult clients of a trainer). *Assumption:* the trainer has **no tie to Ryan's district or club** (meeting open question 1). If she does, stop and tell Legal before her first client (R1).

### T1. Adults only
- MUST: `join_team` and RLS reject `is_minor = true` for general teams (UI and API). Message: "This team is for adults 18 and older."
- MUST: no parent consent, form v2, or consent tracker in general teams. Clients choose for themselves in **"Your choices"** (F8).
- MUST: a member who's on a volleyball team as a minor can never be added to a general team (`is_minor` decides, not the team they came from).

### T2. Trainer confirmations at team creation (in the app)
Three **separate, unticked** checkboxes before a general team is created. All three are required:
1. "I've read and accept the **Trainer Terms** (Terms §4T)." *(link)*
2. "My clients are adults (18+), and I'm responsible for the programs I give them, including screening clients before they train."
3. "I won't put the Approach Strength name on anything my gym prints, posts, or shares."

**Record (new fields, approved):** `teams.trainer_terms_version text`, `teams.trainer_terms_accepted_at timestamptz`, `teams.trainer_terms_accepted_by uuid`, `teams.trainer_confirmations jsonb` (the three items, each with a timestamp). Readable by that trainer and the service role only. If Legal changes §4T, the trainer must accept again before posting new programs (version check).

### T3. The TM-19 gate (MUST before the first client)
1. The trainer emails `ryan@approachstrength.com` confirming in writing:
   - **her current certification** (name and issuing body);
   - **her own professional liability insurance** (Legal also asks for the **insurer's name and the policy's expiry date**);
   - **that she trains clients through her own business.**
2. Ryan checks that the email covers all three, **logs the date received** in a private Legal record (date, team id, what was confirmed, expiry date), and files the email in Zoho → "Trainer records."
3. Ryan sets **`teams.trainer_verified_at`** and **`teams.trainer_verified_by`** with the service role (Supabase dashboard or an admin script).
   - These fields are **writable only by the service role**. No RLS policy lets any user, including the trainer, write them (API test as the trainer must fail).
   - Readable by that team's trainer (to show the "open" state) and the service role.
4. While `trainer_verified_at` is null:
   - `join_team` rejects every join (function check, not only UI);
   - the join code shows "This trainer's team isn't open yet.";
   - the trainer's Clients screen shows "Your team opens once Ryan confirms your details by email."
5. **Not stored in the app:** certification numbers, insurance details, or the email itself.
6. **Lapse:** at the insurance expiry date, Ryan asks for a renewed confirmation. If it isn't received within 14 days, or the trainer says her insurance or certification has lapsed, Ryan **clears `trainer_verified_at`**: no new clients can join, and the trainer can't post new programs. Existing clients keep access to their own history. (→ **Product (01):** add "can't post while unverified" to spec A5.)
7. **Retention:** keep the TM-19 email and log for **5 years after the team closes**, as the C12-style proof record for trainer mode.

### T4. New server fields: approved for 2.3.0
| Field | Verdict | Conditions |
|---|---|---|
| `teams.kind` (`'volleyball' \| 'general'`) | ✅ | Existing teams = `volleyball`. Can't be changed after a team has members (prevents switching a minors' team to general). |
| `programs.target_user_id` (nullable) | ✅ | RLS: a client sees only programs targeted at **them**, their group, or the whole team. A client never sees another client's targeted program, even its title (API test). |
| Free-named groups (`groups.name`) | ✅ | Helper text: "Use a class time or first name. Don't include health details." Group names are visible to members of that group. |
| `teams.trainer_verified_at`, `teams.trainer_verified_by` | ✅ | Service-role write only (T3). |
| `teams.trainer_terms_*`, `teams.trainer_confirmations` | ✅ | T2. |
| Program goal (`Strength`, `Muscle`, `General fitness`, `Back after a break`) | ✅ | No weight-loss, body-composition, injury, or "return to training" goals. "Back after a break" shows the time-off description (spec B3). |
| Gym equipment profile (per team) | ✅ | Gym equipment only; no personal data. Clients' home equipment stays on the device. |
| Cardio logs: minutes only (+ Easy/Moderate as prescribed) | ✅ | No heart rate, pace, distance, speed, calories, or device data (adult rules A4). |
| Templates (trainer-private) | ✅ | No client data inside a template; duplicating to a client copies the plan, not another client's logs. |
| **Anything else** | ❌ until reviewed | Same rule as volleyball (G-5): Claude Code stops for Legal on any new table or column not listed here. |

### T5. Adult clients' check-ins are consumer health data
Check-ins (sleep, soreness, energy, **pain yes/no**) from adult clients are treated as **consumer health data** under laws like Washington's My Health My Data Act and Nevada SB 370 (attorney Q14, Q24b). For general teams:
- MUST: check-ins are **off by default**. The client turns them on in "Your choices" (an affirmative opt-in to **collect**).
- MUST: **sharing with the trainer** is a **separate** toggle, also **off by default**, available only once check-ins are on. Copy: "Share my check-ins with my trainer. Your trainer will see your sleep, soreness, energy, and whether you reported pain. Other clients never will."
- MUST: the trainer **can't** require sharing, turn it on, or see which clients have it off beyond "No check-in shared." Trainer Terms §4T.5 forbids making it a condition of training.
- MUST: turning either toggle off takes effect immediately. Turning sharing off **hides past shared check-ins** from the trainer too.
- MUST: clients can **delete their check-in history** from Settings (all entries). → **Product/UX:** add "Delete my check-ins" to Settings → Your data if not built.
- MUST: the trainer dashboard's **"Pain reported today"** flag appears only when sharing is on, with no detail, and uses the G3 wording on the client side. No body-part question, no swap, no suggested session (adult rules A9).
- MUST NOT: any condition-specific field or option: injuries, pain areas, medical conditions, medications, pregnancy, rehab, health history, PAR-Q style questions (adult rules A7). **Screening is the trainer's job, outside the app** (Terms §4T.3).
- MUST: the workout-note field in general teams shows helper text: "Your trainer sees your notes. Don't include health or injury details." *(Notes stay free text, as built for volleyball; a pick-list is the 2.3.1 AI rule, not a 2.3.0 change.)*
- MUST NOT: sell, use for ads, or share health data with anyone but the client's own trainer (when the client shares) and our processors.
- **Volleyball adults (flag, not a 2.3.0 gate):** "Your choices" for adult volleyball athletes defaults check-ins **on and shared** (v2.1 P1.4). Under the same laws that's weaker than an opt-in. → **Product (01):** switch adult defaults to **off** in the next volleyball patch. Minors are unaffected; their parent ticks boxes 2–3.

### T6. Visibility in general teams
- MUST: a client sees only their own data, programs targeted at them, their group's and team-wide programs, and (if the trainer turns the board on and the client agrees) the board.
- MUST: the trainer sees each client's programs, logs, notes, PRs, level, adjustments, and shared check-ins. **The dashboard never ranks clients** against each other (spec B6).
- MUST: **effort board off by default**; for clients, the **boards** choice in "Your choices" also defaults **off** in general teams. Rack-partner names follow § Rack-partner names (board toggle).
- MUST NOT: messaging, chat, comments, feeds, or client directories. Clients can't see who else is on the trainer's team except through the board or rack cards they've opted into.
- MUST NOT: any access for the gym (owner or staff accounts, exports, or shared logins). The trainer may not give anyone else her login (Terms §4T.5).

### T7. No AI in 2.3.0 (TM-18)
- MUST NOT: any call to an AI or LLM provider, AI SDK, or Edge Function that sends data to one, or any "AI" label, toggle, or placeholder in the UI. No `ai_assisted` column yet.
- MUST: the build's dependency check shows **no AI-provider packages** (e.g., OpenAI, Anthropic, Google AI SDKs) in `package.json` or Edge Functions. *(Using Claude Code to write the code is fine; this rule is about the shipped app.)*
- **Before 2.3.1 (B10):** Legal reviews and approves the provider as a **new subprocessor**: DPA, no training on our data, no retention of prompts beyond abuse checks, US data location, and the B10.2/B10.3 data rules (library IDs and pick-lists only; no client data). The Privacy Notice is updated **before** the feature ships, and the marketing site's never-show list stays.

### T8. Gym, name, and private pilot (R12)
- MUST: the trainer's confirmation 3 (T2) and Terms §4T.6: no Approach Strength name on anything the gym prints, posts, or shares; clients hear about it from the trainer one to one.
- MUST: no trainer or gym content on the marketing site, no outreach to other trainers or gyms, and no gym logos or names in the app (team names chosen by the trainer are fine).
- MUST: the board is shown only on the trainer's own device or a screen she controls, visible to her class only. Gym-owned screens only with the gym's permission.

### T9. Deletion and retention (general teams)
- Client leaves or is removed: the trainer loses access to that client's data **immediately**. The client keeps their own history (I2).
- Client deletes their account: removed within 30 days. **No proof record is kept for adult clients** (no consent form or testing day), except the trainer's own records outside the app.
- Trainer deletes the team: clients keep their own logs; programs posted by the trainer are removed. The TM-19 record is kept 5 years (T3.7).

### T10. Acceptance (Legal's checks for `reports/v2.3.0-acceptance.md`)
- [ ] A minor can't join a general team (UI and API); `teams.kind` can't change once a team has members.
- [ ] The three trainer confirmations are separate, unticked, required, and recorded with the Terms version.
- [ ] With `trainer_verified_at` null, joins fail (API); the trainer can't set it (API as the trainer); after a service-role update, joins work.
- [ ] A client can't read another client's targeted program (API).
- [ ] Check-ins and sharing default **off** for new general-team clients; turning sharing off hides past check-ins from the trainer (API).
- [ ] "Pain reported today" appears only with sharing on, with no detail.
- [ ] No condition-specific, weight-loss, or body-composition fields exist; cardio stores minutes only (schema check).
- [ ] Notes helper text appears in general teams.
- [ ] Effort board and the clients' boards choice default off in general teams; the dashboard has no ranking.
- [ ] No messaging or chat; no gym access.
- [ ] No AI packages, calls, or UI (dependency and network check).
- [ ] Privacy Part A2 and Terms §4T are live at `/privacy#health-data` and `/terms#trainer-terms`, generated only from `docs/legal/`; the footer has "Consumer health data."
- [ ] Volleyball teams unchanged (re-run the v2.2 checks).

### T11. Gates before the trainer's first client (Legal's part)
1. Terms §4T and Privacy Part A2 are **live** on `approachstrength.com` (not just in docs).
2. The trainer has accepted the T2 confirmations in the app.
3. The TM-19 email is received with all three items plus insurer and expiry, logged, and `trainer_verified_at` is set.
4. The trainer confirms she has **no tie to Ryan's district or club** (or Legal has reviewed one).
*Recommended, not gates:* Ryan's GL quote and a short attorney consult (option C), CSCS review of the adult rules.

## Still open for Legal
- Zoho conditions 1–3 (two-factor, DPA, no forwarding): Ryan to confirm.
- Trademark attorney opinion before the App Store, paid promotion, or the first outside coach's forms (R12).
- The AD/principal approval must be signed before the first minor.
- Trainer: her TM-19 email and the district/club-tie answer (T3, T11).
- 2.3.1 AI provider review (T7) when Product hands off B10.
