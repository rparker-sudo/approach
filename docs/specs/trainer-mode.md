# Spec: Trainer mode (personal trainers and their adult clients)
Owner: Product Strategy (01), with Training Content (02), Legal (07), UX/UI (03), Finance (05), Market Research (06), Branding (04) · Draft v0.3 · Sun Nov 15, 2026
Source of truth: Approach project → `product/specs/trainer-mode.md`. Decisions: D-039, D-041, D-042, TM-17, TM-18, TM-19 (`product/decision-log.md`). Meeting: `meetings/2026-11-15-team-meeting.md`.
> **Changes in v0.3 (11/15, team meeting):**
> - **2.3.0 = Phase A + Phase B, no AI** (TM-17, TM-18). Built in one session, launched together; no separate Phase A deploy.
> - **AI workout assistant (§B10) moves to 2.3.1**, after the trainer's first 1–2 weeks. The free-text note becomes pick-lists (Legal).
> - Goal **"Return to training" → "Back after a break"** (time off, not injury).
> - Adult rules for 2.3.0 set in the meeting: **RPE ceiling 8, no rep-max testing for adults, cardio logged by duration only** (§B5).
> - **TM-19 gate** before the trainer's first client (§A5, §Gates).
> - **No co-branding at the gym** (§Rules).
> v0.2 (11/15): A + B one build, AI added. v0.1 (11/15): first draft.

## Why
Founder direction (11/15): the second market is **personal trainers who aren't sport-focused**. A trainer will pilot **privately** in her gym with **adult clients only**, covering **1-on-1 custom programs, small-group classes, and clients who train alone**. The founder wants the full version built now (TM-17) so the pilot produces useful information.

## Rules for all of trainer mode (MUST)
- **Adults only.** A member under 18 can't join a trainer team (birth year from the age gate). No parent consent in trainer mode.
- **Private pilot.** No marketing to trainers or gyms, and no trainer section or tier on the marketing site, until the name question is settled (R12).
- **No co-branding at the gym (Branding, 11/15).** "Approach Strength" doesn't appear on anything the trainer's gym prints, posts, or shares: no flyers, signage, social posts, class schedules, gym website, or emails to members naming it. Clients learn about it from the trainer one to one. The app itself still shows its name. The trainer agrees to this in her TM-19 confirmation (§A5).
- **Out of scope:** booking and appointment scheduling, session payments, membership management (competitors' and the APPROACH trademark holder's space); weight-loss or body-composition tracking; nutrition plans; messaging or chat; client-facing AI; post-injury or rehab programming; conditioning programs (undecided; cardio is duration-only blocks).
- **Product principles hold:** boards rank work, not weight; suggest, don't auto-change; the client owns their history (G-2); collect less.
- **Volleyball teams don't change.** Every v2.2.x check still passes for volleyball teams.

## Build plan (TM-17)
- **2.3.0 = Phase A + Phase B, no AI.** One spec, one Claude Code session, built in order **A → B**, **launched together**.
- `CLAUDE.md` names this spec as **trainer-mode.md v0.3**; Claude Code stops if `docs/` has another version.
- Save **`reports/v2.3.0-acceptance.md`** (one row per criterion: pass / fail / partial) **before** asking Ryan to approve the deploy. **No deploy if any Phase A criterion fails** (TM-17 stop rule).
- Migrations `009_trainer_a.sql`, `010_trainer_b.sql`, each safe to re-run. Version **2.3.0**; CHANGELOG; `build-snapshot.md`; tag `v2.3.0`.
- **2.3.1** adds the AI workout assistant (§B10) after the trainer's first 1–2 weeks (TM-18). Migration `011_trainer_ai.sql`.
- Training's adult content and Legal's trainer sections are written the same day and are **unreviewed by a CSCS or an attorney** (recorded risk, TM-17).

## What carries over
| Works for trainers as built | Hidden in trainer teams |
|---|---|
| Builder, per-person level resolution, rest floors, logging, rest timers, progression, easing back in after time off (G9), home workouts, racks, stations, circuits, supersets, live board, adult "Your choices," account deletion | Volleyball generator, positions, match/tournament/practice events, approach touch, jump tests, testing days, "Above the net," Jump gains, volleyball Fuel cards, parent consent, effort board on by default |

---

# PHASE A · Trainer teams (the foundation)

## A1. Team type
**Create team** asks: **Volleyball team** or **Training clients (adults 18+)**. Store `teams.kind: 'volleyball' | 'general'` (existing teams = `volleyball`).

## A2. Adults only
- `join_team` and RLS reject `is_minor = true` for general teams. Message: "This team is for adults 18 and older."
- Members use the adult **"Your choices"** permissions (F8). No consent recording or tracker.

## A3. Hide volleyball pieces
For general teams and their members: skip position and volleyball-week onboarding steps; calendar offers only **Session** and **Break**; hide testing days, touch, jump tests, "Above the net," Jump gains, Fuel, and the volleyball generator; hide exercises Training marks **volleyball-only** (T-A1). Effort board **off by default** (the trainer can turn it on).

## A4. Groups and assignment
- **Free-named groups** in general teams ("Mon/Wed 6am class," "Alex"). A client can be in one group per team.
- **Post a program** to the whole team, a group, or **a single client** (explicit client target; `programs.target_user_id` nullable).

## A5. Trainer confirmation and the TM-19 gate
**In the app, at general-team creation:**
- The trainer accepts the **trainer section of the Terms** (Legal, T-A2; it replaces the school/club coach clause for independent trainers) and confirms: "My clients are adults, and I'm responsible for the programs I give them."
- She also confirms: "I won't put the Approach Strength name on anything my gym prints, posts, or shares."
- Recorded: who, when, Terms version.

**Before her first client can join (TM-19, MUST):**
- The trainer emails `ryan@approachstrength.com` confirming in writing: **(1) her current certification** (name and issuing body), **(2) her own professional liability insurance**, and **(3) that she trains clients through her own business**.
- Ryan logs the date he received it. The app enforces the gate with **`teams.trainer_verified_at timestamptz`** and `trainer_verified_by` (nullable; settable **only by the service role**, i.e., Ryan through the Supabase dashboard or an admin script; never by the trainer).
- Until it's set, the team's join code shows: "This trainer's team isn't open yet." The trainer sees on her Clients screen: "Your team opens once Ryan confirms your details by email." `join_team` rejects joins while it's null (RLS/function check, not only UI).
- The email itself stays in Ryan's mailbox (not stored in the app). The certification and insurance details are **not** stored in the app.
- *Legal noted option C (also Ryan's general liability quote and an attorney consult first) is better. Recorded.*

## A6. Phase A acceptance criteria
- [ ] Team type picker; existing teams stay volleyball.
- [ ] A minor can't join a general team (UI and API test).
- [ ] General-team members never see positions, match/tournament/practice events, testing days, touch, jump tests, "Above the net," Jump gains, or Fuel; the generator isn't offered.
- [ ] Programs post to team, group, or single client; each client sees only what's posted to them plus team-wide posts.
- [ ] Level resolution, rest floors, logging, progression, racks, stations, circuits, supersets, home workouts, and the board work for a general team (smoke test of each).
- [ ] Effort board off by default for general teams; can be turned on.
- [ ] Trainer Terms acceptance and both confirmations are recorded at creation.
- [ ] **TM-19 gate:** with `trainer_verified_at` null, a client can't join (UI and API test); the trainer can't set the field herself (API test as the trainer); once Ryan sets it with the service role, joining works.
- [ ] Volleyball teams unchanged (re-run v2.2 pass 1 checks).

---

# PHASE B · Full trainer version

## B1. Trainer and client wording
In general teams only: "Coach" → **"Trainer"**, "Athlete" → **"Client"**, "Roster"/"Team" → **"Clients"** where it reads naturally (UX string list, T-B5). Volleyball teams keep their wording.

## B2. Client programs (multi-week)
- A **program** = 1–16 weeks, 1–6 sessions per week, assigned to a client, a group, or the whole team.
- **Week view** in the builder: sessions per day; copy a session to other days; copy a week forward; optional deload week (sets about −40%, same rest, per R8).
- **Templates:** the trainer saves any program or session as a template (trainer-private) and starts new programs from one. **Duplicate to another client** in one step.
- **Progression across weeks:** weight suggestions follow existing double progression (G5) per client; the trainer can set a per-exercise rep range and target RPE per week (e.g., weeks 1–3 RPE 7, week 4 deload), capped by the adult ceiling (B5).
- **Per-client edits** don't change the template or other clients.
- **Program end:** two weeks before the last week, the trainer sees "Alex's program ends Dec 12."

## B3. Goals
- Each program has a **goal**: **Strength**, **Muscle**, **General fitness**, or **Back after a break**. The goal sets default sets, reps, rest, and RPE for each slot role, from Training's goal table (`content/programs/adult-goals.md`, T-B2).
- **"Back after a break"** means returning after **time off** (like G9's easing back in): lighter loads and effort that build back up. It is **not** for returning from injury, illness, or surgery. Its description and the builder say so: "For clients coming back after time off. Clients returning from an injury or medical condition should be cleared by a qualified professional first."
- **No weight-loss, fat-loss, or body-composition goals**, and no bodyweight targets (product principle; D-007).

## B4. General exercise library and equipment
- Add Training's **general library** (`content/general-library.md`, T-B1): machines, cables, cardio equipment (bike, rower, treadmill, sled), more bodyweight and mobility, general warm-ups; each with `tier`, `level`, `pattern`, `equipment`, cues, and no claim words.
- **Gym equipment profile** per general team: the trainer ticks what the gym has; builder and resolution only offer exercises that fit. Clients' **home equipment** stays on the device (as built).
- **Cardio blocks:** a slot type logged **by duration only** (e.g., "Bike 10 min, easy pace"). No heart rate, pace, distance targets, calories, or interval prescriptions in 2.3.0 (conditioning is undecided).

## B5. Adult training rules (2.3.0)
Set in the 11/15 meeting; Training's `content/adult-training-rules.md` (T-B3) gives the details. Enforced in `resolveSession` and the builder for general teams:
- **RPE ceiling 8** for strength work (the effort clamp **blocks** above 8 in general teams; "to failure" and "max" blocked in strength slots; power slots keep "Max effort" as speed).
- **No rep-max or estimated-max testing for adults.** No testing days in general teams at all in 2.3.0.
- Weekly session caps and the rest-day rule per T-B3 (without volleyball practice load).
- Rest floors (tier A/P) as built.

## B6. Trainer dashboard
A **Clients** home for the trainer (general teams):
- One row per client: program and week ("Strength · week 3 of 8"), sessions this week done/planned, last session date, check-in shared today (only if the client shared check-ins), level.
- **Flags (text, not color alone):** "No session in 7 days," "Program ends in 2 weeks," "Pain reported today" (from the shared check-in; G3 wording, no detail).
- Sort by name, last session, or flag. **Never ranks clients** against each other.
- Tap a client → client detail: program, recent logs and notes, PRs (private to trainer and client), level, adjustments ("3 exercises adjusted to level").

## B7. Client experience
- Today shows the trainer's program for the day, with goal and week ("Strength · week 3").
- Workout notes the client types on a log are visible to the trainer (as built). **No messaging or chat** (principle 5).
- Check-ins work as built for adults, with the separate "share with my trainer" choice. Pain = yes shows the G3 message.
- Clients training alone use home workouts as built.

## B8. Small-group sessions
Group programs, racks, stations, circuits, supersets, and the live board work as built for general teams. The board shows only board-safe data (no weights, RPE, check-ins, levels). Effort board stays off by default.

## B9. Legal requirements (T-A2 / T-B4, no AI part)
From Legal:
- **Trainer section of the Terms:** the trainer is an independent business using Approach Strength with her own adult clients; she's responsible for programming and supervision; no medical services; the no-co-branding commitment.
- **Privacy section** for adult clients of a trainer: what the trainer sees; check-ins (including the pain flag) as consumer health data with the separate sharing choice.
- **§ Trainer mode** in `legal/compliance-v2.1.md`, including the TM-19 gate and the new server fields (`teams.kind`, `programs.target_user_id`, `teams.trainer_verified_at/_by`, Terms acceptance record).

## B11. Phase B acceptance criteria (2.3.0)
**Programs and goals**
- [ ] A trainer builds an 8-week program with 3 sessions/week, a deload week, and per-week RPE; assigns it to one client; duplicates it to a second client and edits it without changing the first.
- [ ] The four goals are Strength, Muscle, General fitness, Back after a break; defaults match `adult-goals.md`; "Back after a break" shows the time-off description; no weight-loss or body-composition goal exists anywhere; the string "Return to training" doesn't appear.
- [ ] Templates save and start new programs; "program ends in 2 weeks" appears.

**Library and rules**
- [ ] General library exercises from `general-library.md` are present with tiers, levels, equipment, and no claim words (claim-word search).
- [ ] The gym equipment profile limits builder and resolution choices.
- [ ] Cardio slots log duration only; no heart rate, pace, distance, or calorie fields exist.
- [ ] In general teams the builder blocks RPE above 8, "to failure," and "max" in strength slots; `resolveSession` caps at 8.
- [ ] No testing days or rep-max tests are available in general teams (UI and API test).

**Dashboard and client**
- [ ] The Clients dashboard shows each client's program/week, sessions done/planned, last session, shared check-in, and text flags; never ranks clients.
- [ ] Trainer/Client wording appears only in general teams.
- [ ] No messaging or chat exists.

**General**
- [ ] Volleyball teams unchanged (re-run v2.2 checks); `tsc`, `lint`, `build:web`; migrations safe to re-run; version 2.3.0; CHANGELOG; `build-snapshot.md`; acceptance report saved before deploy approval.

---

# 2.3.1 · AI workout assistant (§B10, D-042)
**Not in 2.3.0** (TM-18). Built after the trainer's first 1–2 weeks of using 2.3.0, with her feedback. The rules below are the direction; Product revises them before the 2.3.1 hand-off.

## B10. AI workout assistant
**Who and where:** trainers in **general (adult) teams only**, inside the builder. **Never** in volleyball teams, never for minors, never shown to clients directly.

**B10.1 Two ways to use it**
1. **Draft with AI:** the trainer picks goal (B3), weeks, sessions per week, session length, level, the gym equipment profile (or home equipment), exercises to avoid (picked from the library), and **preferences from pick-lists** (e.g., "more single-leg work," "keep sessions short," "more upper body," "machine-based," "minimal equipment"). **No free-text field** (Legal: free text can carry health details). The AI returns a **draft program** in the builder.
2. **Suggest while building:** on any session or exercise: **"Suggest a swap,"** **"Add an accessory,"** **"Balance this week,"** **"Shorten to 40 min."** Suggestions appear as proposed changes the trainer accepts or rejects one by one.

**B10.2 What's sent to the AI provider (MUST)**
- Only the pick-list settings, the current draft's structure, and **exercise IDs and names from our library**.
- **Never:** client names, emails, ages or birth years, check-ins, pain flags, logs, notes, or anything identifying a client.

**B10.3 What comes back (MUST)**
- Structured output only (the program JSON schema): exercise IDs **from our library**, sets, reps, rest, RPE, grouping. Unknown IDs or free-text exercises are dropped.
- Every draft and suggestion passes the **same rules engine** as hand-built programs: levels, the adult RPE ceiling of 8, rest floors, weekly caps and rest day, pairing and circuit rules, equipment fit. Items that fail are fixed to the nearest valid option or removed, and the trainer sees what changed.
- No rehab or injury programs, medical advice, nutrition or diet plans, supplements, or weight-loss programming (the pick-lists don't offer them; the system prompt refuses them).

**B10.4 Trainer stays in control**
- Drafts are labeled **"AI draft. Review before posting."** Nothing posts to a client without the trainer's **Post**.
- Footer: "AI suggestions can be wrong. You're responsible for the programs you give clients."
- Programs store `ai_assisted boolean` (internal).

**B10.5 Server and limits**
- Calls go through a **Supabase Edge Function** holding the provider API key. Only signed-in trainers of a verified general team can call it.
- Rate limit (default 40 requests per trainer per day) and a **monthly spend cap** set by Finance, with an automatic shutoff.
- Store usage counts and token totals only, not prompts or responses.

**B10.6 Not in scope:** AI for clients, AI chat, AI reading logs to auto-adjust programs, AI in volleyball teams, AI-written library text.

**B10.7 Marketing:** "AI-generated programs" stays on the marketing site's never-show list.

**B10.8 Before 2.3.1 is handed off:** Legal approves the provider (new subprocessor; compliance currently allows only Supabase, GitHub Pages, Zoho) and updates the privacy notice; Finance adds the AI cost line and cap (the budget base case is already past $5K); Training reviews sample drafts (one per goal and level) and finds no rule failures the engine missed.

---

## Pilot learning (Market Research)
A separate learning pilot from the volleyball one. **The trainer's intake is completed before she sees the app** (11/15 rule). Then a 2-minute weekly note and an end-of-block interview. Questions for 2.3.1: where she'd want AI help, and how much time programming takes her today. Results stay separate from D-038's volleyball signals; one trainer is a sample of one.

## Gates before the trainer's first client
1. 2.3.0 deployed with every Phase A criterion passing (stop rule).
2. Legal's trainer Terms section, adult-client privacy section, and § Trainer mode are live (T-A2/T-B4).
3. **TM-19:** the trainer's email (certification, own professional liability insurance, own business) received at `ryan@approachstrength.com`, Ryan logs the date and sets `trainer_verified_at`.
4. In-app confirmations accepted (adults, responsibility, no co-branding).
5. Trainer intake done (Market Research).
*Recommended, not gates (Legal, Finance, Training):* Ryan's general liability quote, attorney consult, CSCS review of the adult content.

## Blockers (owner → needed before the 2.3.0 build)
| # | Item | Owner | Doc |
|---|---|---|---|
| T-A1 | Volleyball-only exercises to hide | Training (02) | `content/tagging-taxonomy.md` |
| T-A2 | Trainer Terms section; trainer confirmations' wording (incl. no co-branding) | Legal (07) | `legal/soft-launch-notice.md`, Terms |
| T-A3 | Phase A screens (team type, groups, assign to client, "team not open yet" states) | UX (03) | `design/trainer-mode.md` |
| T-A4 | Trainer intake and weekly note | Market Research (06) | `research/trainer-pilot.md` |
| ~~T-A5~~ | ~~Private pilot under the current name~~ | Ryan | **Closed 11/15 (D-041)** |
| T-A6 | Trainer's TM-19 email received and logged | Ryan | Before the first client (not before the build) |
| T-B1 | General exercise library | Training (02) | `content/general-library.md` |
| T-B2 | Goal table (Strength, Muscle, General fitness, Back after a break) | Training (02) | `content/programs/adult-goals.md` |
| T-B3 | Adult training rules (RPE 8, no rep-max testing, caps, rest day) | Training (02) | `content/adult-training-rules.md` |
| T-B4 | Adult-client privacy section; § Trainer mode in compliance (no AI part) | Legal (07) | `legal/` |
| T-B5 | Phase B screens and the Trainer/Client string list (no AI screens) | UX (03) | `design/trainer-mode.md` |
| ~~T-B6~~ | AI provider cost and cap | Finance (05) | **Moved to 2.3.1** |
