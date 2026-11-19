# Adult Training Rules (trainer mode, general teams)
Owner: Training Content / Sports Science (02) · v1.0 · Sun Nov 15, 2026
Status: **Ready for the 2.3.0 build (T-B3). Unreviewed by a CSCS** (recorded risk TM-17). **[CSCS]** marks review items (§11).
For: `product/specs/trainer-mode.md` §B5, general (adult) teams only. Rules set in the 11/15 meeting: **RPE ceiling 8, no rep-max testing for adults, cardio logged by duration only.**
**Volleyball teams don't change.** Everything in `content/safety-guidelines.md` still applies to them exactly as written.

> **Coach freedom (11/18, founder):** A1 (RPE 8 block), A3 (AMRAP block), §4 caps, and §5 warnings now apply only to **Approach-generated programs and suggestions**. A trainer building or editing a workout has full control, with no blocks or warnings (`content/program-design.md` §10). A2 (no testing features in trainer mode), A4 (cardio by duration only), A7, and A8 are product features, not building limits, and stay.

> **Not medical advice.** Approach gives the trainer tools to program for **healthy adult clients**. It doesn't screen clients, diagnose, treat, or clear anyone to exercise. Pre-participation screening, health questions, and any condition-specific programming are the trainer's professional responsibility, outside the app.

---

## 1. Who this covers
- Clients **18 and older** on a general team (minors are blocked from joining, spec A2).
- The **trainer is a certified professional** running her own business (TM-19). Where the volleyball rules *block* a coach's choice to protect minors, trainer mode usually *warns* instead, **except** the hard rules in §2, which block.

## 2. Hard rules (MUST, enforced in the builder and `resolveSession`)
| # | Rule | Builder behavior |
|---|---|---|
| A1 | **RPE ceiling 8** for strength work (all levels). | Blocks "RPE 9," "RPE 10," "failure," "to failure," "max" in strength slots. Line: "Strength work stays at RPE 8 or below. Stop with about 2 reps left." Power slots keep "Max effort" (meaning max speed). `resolveSession` caps every strength slot at 8. |
| A2 | **No testing.** No rep-max tests, no estimated maxes (e1RM), no testing days, no %-of-max loading. | Testing days, strength checks, jump tests, and e1RM displays don't exist in general teams (UI and API). |
| A3 | **No AMRAP or "for time" on tier A/B** (it conflicts with A1). | Blocked in tier A/B rows, in circuits too. Timed intervals stay allowed on tier C/D (core, care, mobility). |
| A4 | **Cardio is logged by duration only** (§6). | No heart rate, pace, distance, speed, calories, or interval fields exist. |
| A5 | **Rest floors** as built: tier A ≥ 2:00, tier P ≥ 1:30. | Same as volleyball. |
| A6 | **Level gates** as built (G8 resolution): a client never gets an exercise above their level. | Same as volleyball. |
| A7 | **No condition-specific programming or fields:** nothing for pregnancy, injuries, pain areas, medical conditions, medications, or rehab. No goal or note template implies it. | No such fields or options exist. |
| A8 | **No weight-loss, body-composition, or bodyweight targets.** | No such goals or fields (spec B3). |
| A9 | **Pain = yes** shows the G3 message to the client and "Pain reported today" (no detail) to the trainer, if the client shares check-ins. No swaps, no body-part logic, never asks where. | As built (spec B6/B7). |

## 3. Loading and progression
- **Starting weights:** the trainer enters a starting weight or leaves it blank; the client picks a weight that matches the effort target. **No testing to set loads** (A2).
- **Week to week:** the existing double progression (G5): add weight when the client hits the top of the rep range on every working set, capped at about 10% (max +10 lb barbell, +5 lb dumbbell/kettlebell), no suggestions for bands, holds, or `assisted-pullup`.
- **Per-week effort** from the goal's wave (`adult-goals.md` §4), always ≤ RPE 8.
- **Beginners:** goal defaults for clients the trainer rates beginner are shifted down one RPE (e.g., 7–8 → 6–7), like `BEGINNER_EFFORT`. This is a default, not a cap; the cap is A1.
- **Easing back in (G9)** applies as built: 14+ days without a logged session → 7 days at RPE ≤ 6 and suggestions about 10% lower. "Back after a break" (`adult-goals.md`) is the trainer's planned version for longer breaks.

## 4. Weekly limits and recovery
There's no sport practice on top of training, so the caps are higher than for volleyball athletes.
| Client level | Max **strength** sessions per week | Notes |
|---|---|---|
| Beginner | **4** | Suggested 2–3 |
| Intermediate | **5** | |
| Advanced | **6** | |
- **At least 1 day per week with no strength training and no Moderate cardio** (Easy walking and extra recovery sessions are fine). The builder blocks a 7th consecutive training day and warns if the rest day only appears every 7 days without a deload in the program.
- **No two lower-body-heavy sessions on consecutive days** (same H5 logic as home workouts). In trainer mode this is a **warning**, not a block, with "Try an upper-body or full-body session here."
- **What counts toward the cap:** any session with tier A or B strength work, at the gym or at home. **Doesn't count:** cardio-only sessions, extra recovery sessions, and warm-up-only sessions.
- **Cardio-only sessions:** up to 60 min, Easy or Moderate. Unlimited count, but they must leave the rest day free of Moderate cardio.
- **Several programs at once (MUST check):** a client can get a team-wide program, a group program, and a single-client program at the same time (spec A4). **Caps and the rest-day rule apply to everything posted to that client combined.** When posting, the trainer sees "Alex already has 3 sessions a week from Mon/Wed 6am class. This program adds 2 (total 5, max 5 for intermediate)." Over the cap: blocked for the extra sessions, with that reason. → **Product (01)**: confirm this in spec A4/B2.
- **Deloads:** every 4–6 weeks (goal wave default: week 4). Programs of 7+ weeks without one show a warning.
- **Light home day exception** (volleyball) isn't needed here and isn't used: the higher caps already allow it.

## 5. Session structure
- **Warm-up:** general warm-up W1–W3 (`general-library.md` §6), default on, plus the existing per-lift warm-up sets before tier A lifts.
- **Order:** power first (if any), then tier A, then the rest, the same principle as the volleyball rules. In trainer mode, putting power or tier A later is a **warning**, not a block.
- **Supersets and circuits:** all pairing and circuit rules from `rest-and-supersets.md` §4 and `circuits-and-stations.md` Part 1 apply, except the "minors" items become **warnings** in general teams: power/heavy lifts in a circuit or station, contrast pairs (heavy lift → jump). **A3 still blocks** AMRAP/for-time on tier A/B.
- **Stations:** Part 1 (power + main tier A together) is a **warning** in general teams, as on adult-only volleyball teams.
- **Session length:** the estimate shows as built; general-team targets are 45–60 min (gym) and 30 min (home), editable by the trainer.

## 6. Cardio blocks (duration only)
- **Prescription:** exercise + **duration in minutes** + **effort word**: **Easy** or **Moderate**.
  - **Easy:** "You can hold a full conversation."
  - **Moderate:** "You can talk in short sentences, but not sing."
- **Not in 2.3.0:** "Hard," intervals, heart rate or zones, pace, speed, distance, incline/resistance targets, calories, or "for time." (Conditioning programs are undecided; spec Out of scope.)
- **Limits:** 5–60 min per block. Total cardio per session ≤ 60 min. Back after a break: Easy only, ≤ 15 min.
- **Logging:** the client logs **minutes done** (prefilled with the prescription) and marks it done. Nothing else is recorded.
- **Placement:** as a warm-up (Easy, 3–10 min), a finisher (after strength work), or a cardio-only session.
- **Equipment:** only cardio exercises that fit the gym profile (or `walk-jog`, which needs none) are offered.

## 7. Levels for adult clients
- Use the same three levels and the **technique checklist in `safety-guidelines.md` §2b**. The checks are about movement quality and training history, so they fit adults too.
- The **trainer sets each client's level** (`team_members.level`). A client's self-reported level is a starting point. Adults can't be locked out of anything by age; level is the only gate.
- **Olympic lift (hang power clean):** level 3, with "Only with coaching" (unchanged).
- Level is never shown to other clients, on the board, or anywhere else but the trainer's views and the client's own Settings (as built).

## 8. Small-group classes
- Group programs, racks, stations, circuits, supersets, and the live board work as built.
- **Per-client resolution still applies:** a class program built at intermediate gives a beginner client their own easier versions (G8).
- **Effort board off by default.** If the trainer turns it on, it ranks effort only (sessions, consistency, streak), never weights, check-ins, or bodies.
- Rack sizes from `safety-guidelines.md` §6 apply as hints.

## 9. What the app doesn't do for adults (by design)
- No health screening questionnaire, no medical history, no condition flags (A7). The trainer screens clients her usual way, outside the app.
- No age-based adjustments for older adults. The trainer judges this through level and goal choice. **[CSCS]** (§11)
- No automatic changes from check-ins (R9): readiness only shows the trainer a signal.
- No AI programming in 2.3.0 (TM-18). When 2.3.1 adds it, every AI draft must pass these same rules (spec B10.3).

## 10. Acceptance criteria (for Product)
- [ ] In a general team, the builder blocks RPE above 8, "failure," "to failure," "max," "AMRAP," and "for time" in tier A/B rows; `resolveSession` caps strength slots at RPE 8.
- [ ] No testing days, strength checks, jump tests, rep-max entries, or e1RM appear in general teams (UI and API).
- [ ] Cardio slots take only duration (5–60 min) and Easy/Moderate; logs store minutes only; no HR, pace, distance, speed, or calorie fields exist.
- [ ] Weekly strength-session caps (4 / 5 / 6 by level) and ≥ 1 rest day are enforced **across all programs posted to a client**; posting over the cap is blocked with the combined-total message.
- [ ] Cardio-only, extra recovery, and warm-up-only sessions don't count toward the cap.
- [ ] "Minors" pairing/circuit/station rules show as warnings in general teams; AMRAP/for-time on tier A/B is still blocked.
- [ ] A beginner client in a class program built at intermediate gets level 1 versions.
- [ ] No pregnancy, injury, medical-condition, weight-loss, or body-composition fields or options exist in general teams.

## 11. Items for CSCS review [CSCS]
1. **Weekly caps** for adults (4 / 5 / 6 strength sessions by level) and the rest-day rule without sport practice.
2. **Relaxing the youth rules to warnings** for adults: power/heavy lifts in circuits and stations, contrast pairs, exercise order.
3. **RPE ceiling 8 for advanced adults:** whether a certified trainer should be able to go to RPE 9 for advanced clients later.
4. **No testing for adults:** whether trainer-supervised rep-max testing for adults should come later (it was ruled out for 2.3.0).
5. **Older adults:** whether any age-aware defaults are needed (e.g., for clients 65+), or whether level and goal choice are enough.
6. **Cardio limits:** Easy/Moderate only and 60 min per block; whether intervals or "Hard" should be added when conditioning is decided.
7. **Back after a break** ramp and the −20% starting weights (`adult-goals.md` §2).

## Flags for other agents
| To | Item |
|---|---|
| **Product (01)** | Confirm caps and rest-day checks across all programs posted to one client (§4); add to spec A4/B2. Confirm warnings (not blocks) for the "minors" pairing/station rules in general teams (§5). |
| **Legal (07)** | §9: Approach doesn't screen clients; the trainer's Terms section should say pre-participation screening is hers. A7: confirm "no condition-specific fields" matches the adult-client privacy section. |
| **UX (03)** | Cardio block row (duration + Easy/Moderate with the talk-test lines), combined-cap message when posting, warning (amber) vs. block (red) states in general teams. |
| **Market Research (06)** | Ask the trainer in her intake how she screens clients today, and whether duration-only cardio is enough for her classes. |
