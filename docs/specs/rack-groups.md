# Spec: Rack groups (v2.2)
Owner: Product Strategy (01), with UX/UI (03), Legal (07) · Draft v1.0 · Tue Nov 10, 2026
Source of truth: Approach project → `product/specs/rack-groups.md`.
Decision: D-026. Builds on v2.1 pass 2 (coach board P3, consent flags P1, board names P2).
**Status: draft for founder review. Not handed off; v2.2 starts after v2.1 ships.**

## Goal
Coaches split the team into **rack groups**: who lifts together at which rack or station. Groups can be set by hand or auto-assigned (random, balanced mix, by experience, by position). Athletes see their rack in the app, and the live board shows athletes by rack so everyone knows where to go.

## Not in scope
- **Position groups don't change.** They still decide each athlete's program. Rack groups only decide *where and with whom* athletes lift.
- No different programs per rack.
- No squad competition or rack scores on the effort board (founder didn't choose it; possible later).
- No grouping by strength, test results, or estimated maxes.

## Persona → problem
- **Coach Dana:** 16–30 athletes and 4–6 racks. She sorts them on a whiteboard every session, and beginners end up together with nobody to learn from.
- **Athlete Marcus:** walks in not knowing which rack he's on or who he's spotting.

---

## R1. Data
- `rack_groups`: `id`, `team_id`, `name` (default "Rack 1"…"Rack N", max 20 chars), `sort_order`, `created_by`, `updated_at`.
- `rack_group_members`: `group_id`, `user_id`, `team_id`; **unique (team_id, user_id)**, so an athlete is in at most one rack group per team.
- Assignments last until the coach changes them.
- RLS: only the team's coach writes. Members read their own group (see R5 for partner names).

## R2. Coach setup (Team → **Racks**)
1. Choose either **number of racks** (1–12) or **athletes per rack** (2–6). The app calculates the other and shows the result (e.g., "16 athletes → 5 racks of 3–4").
2. **Who's here today** (optional): the coach can untick athletes who are absent before auto-assigning, so groups balance around who's actually there. This is a temporary filter, **not** stored as attendance.
3. Rename racks (e.g., "Squat rack," "Platform 2"). Helper text: "Use neutral names. Groups show on the team board."
4. Choose an auto-assign method (R3), see a **preview**, then **Apply**. Or skip auto and assign by hand.
5. **Manual edits:** drag an athlete between racks (tap-to-move on phone). Athletes left out sit in an "Unassigned" tray.
6. **Re-run** auto-assign at any time; it replaces the current groups after a confirm ("Replace current racks?").

## R3. Auto-assign methods
Inputs allowed: **roster, experience level, position group**, and the "here today" filter. **Never** test results, estimated maxes, logged loads, check-ins, pain, bodyweight, age, or nutrition.

| Method | How it works |
|---|---|
| **Random** | Shuffle and deal into racks; sizes differ by at most 1. "Shuffle again" re-deals. |
| **Balanced mix** | Each rack gets a mix of experience levels and positions. Sort by level (advanced → beginner), deal in snake order (1→N, N→1); then swap within the same level to spread positions. Aim: every rack with ≥ 2 athletes has at least one intermediate or advanced athlete when the roster allows. |
| **By experience** | Athletes at the same level are grouped together, filling racks in order; a leftover level shares a rack with the nearest level. **Rack names and order are not tied to level:** after grouping, rack numbers are shuffled, so "Rack 1" isn't always the advanced group. |
| **By position** | Start from position groups; split any group bigger than the rack size into even parts; merge small leftovers with the closest group (e.g., setters with liberos). |

Ties and leftovers are resolved randomly. The preview shows each rack's names and, **to the coach only**, small level and position chips.

## R4. Live board (extends v2.1 P3)
- Board setting **"Arrange by rack"** (default on when racks exist): the tile grid becomes rack sections, each with a header ("Rack 2 · 3 athletes") and its athletes' tiles. Sections flow left to right; empty racks are hidden.
- The group filter gains rack choices ("Rack 2").
- Never show experience level, position-based labels for racks, or the method used on the board. Rack names only.
- Athletes without board consent (`c_boards`) or set to Hidden don't appear, as in P3.4. If that hides everyone in a rack, the rack shows "Rack 4" with no tiles.

## R5. Athlete app
- Today screen card: **"You're on Rack 2"** with partners' board names ("with Jordan M. and Ava R."). Partners without `c_boards` or set to Hidden are shown as "1 more teammate."
- Updates live when the coach changes groups; a small "Moved to Rack 3" note shows once.
- Solo athletes: no racks.

## R6. Edge cases
- An athlete joins mid-season: they go to the Unassigned tray; the coach gets a one-line prompt "Add Riley to a rack?" with a suggestion from the last method.
- An athlete leaves or is removed: they're removed from their rack; the rack keeps its name.
- Coach changes the rack count: existing groups stay until the coach re-runs auto-assign or edits by hand.

---

## Acceptance criteria
- [ ] The coach can create 1–12 racks by count or size, rename them, and assign athletes by hand (drag on web, tap-to-move on phone).
- [ ] Each of the four methods produces racks whose sizes differ by at most 1 (except "by position" merges, which stay within ±1 of the target size).
- [ ] **Balanced mix:** with a roster of at least one intermediate/advanced athlete per rack, every rack of 2+ gets one.
- [ ] **By experience:** rack numbers are shuffled after grouping (run 20 times: the advanced group isn't always Rack 1).
- [ ] The auto-assign code reads only roster, level, and position (code review: no reads from `test_results`, `workout_logs` loads, `readiness`, or profile birth year).
- [ ] The "here today" filter isn't written to `attendance`.
- [ ] An athlete is in at most one rack per team (DB constraint).
- [ ] The live board's "Arrange by rack" groups tiles under rack headers; no levels or positions appear; P3.4 rules still hold.
- [ ] The athlete's Today card shows their rack and partners' board names, with hidden or non-consented partners shown as "1 more teammate."
- [ ] Only the coach can change racks (API test).

## Needs
- **UX (03):** Racks setup screen (count/size, here-today list, method picker, preview, drag-and-drop), board rack sections, Today card.
- **Legal (07):** confirm that showing rack partners' board names to teammates in the app is covered by consent box 4 (boards). If not, partners show as "teammates" only.
- **Training Content (02):** optional: recommended athletes per rack by exercise type (e.g., 3 per squat rack for spotting).
- **Market Research (06):** add to coach interviews: how do coaches split racks today?
