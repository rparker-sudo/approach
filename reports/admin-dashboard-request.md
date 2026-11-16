# Request: in-app admin dashboard (for Product, Legal, and the owner)

**From:** Claude Code, on the owner's instruction (Ryan, November 16, 2026).
**Status:** **waiting for approval. Nothing is built.**

## What Ryan asked for
> "There should be an admin log in for me and dashboard so that I can handle all of these kinds of things directly in the website myself."

Today Ryan opens a trainer's team (TM-19) by running SQL in Supabase → SQL Editor (README, "Verifying a trainer").

**Options he was offered:**
- an admin script on his Mac (allowed by spec A5 today);
- saved Supabase queries;
- an in-app dashboard.

**He chose the in-app dashboard.**

## Why this needs approval first
| Rule | What it says | Effect |
|---|---|---|
| CLAUDE.md, current task step 3 | "Don't build any in-app admin control for verification." | Must be lifted by the planning team. |
| Compliance T3.3 (Legal, MUST) | `trainer_verified_at/_by` are "writable only by the service role. No RLS policy lets any user, including the trainer, write them." | An admin screen means a signed-in account can change them. T3.3 needs new wording. |
| Compliance T4 and G-5 (hard stop) | Any new table or field must be in T4. | The design below adds two small tables (`app_admins`, `admin_actions`). Both need T4 rows. |
| Marketing site rules | No scripts, forms or sign-in on approachstrength.com. | The dashboard lives in the **app** (app.approachstrength.com), not on the website. |

## Proposed design (smallest safe version)
**Who is an admin:**
- New table `app_admins (user_id uuid primary key references auth.users, added_at timestamptz)`.
- No grants: nobody can read or write it from the app.
- Rows are added only in the Supabase SQL Editor (service role), so no account can make itself an admin.
- `is_app_admin()` is a security-definer function that returns true or false for the signed-in user.

**What an admin can do (2.3.x scope):** trainer verification only (TM-19).
- `admin_trainer_teams()` lists every trainer team:
  - team name, join code, trainer name and email;
  - Trainer Terms version and acceptance date;
  - verified at / by;
  - number of clients.
- It returns **no client data** and no check-ins, logs or programs.
- `admin_set_team_open(team uuid, open boolean)` sets or clears `trainer_verified_at/_by`. The `_by` value is the admin's name.

**Audit log (the proof record):**
- New table `admin_actions (id, admin_id, action, team_id, at)`.
- Every open or pause is written to it.
- Admins can read it; nobody can edit or delete rows from the app.
- This keeps the T3.2/T3.7 record of who opened which team, and when.

**Screen:** Settings → **Admin**, shown only when `is_app_admin()` is true. It has a list of trainer teams with status (Not open / Open / Paused) and two actions:
- **Open team:** a required checkbox, "I received the trainer's email confirming certification (name and issuing body), professional liability insurance (insurer and expiry), and that they train clients through their own business." It stores nothing about those details (T3.5).
- **Pause team:** asks for confirmation first.

**Security notes:**
- An admin account can open any trainer team. If the account is taken over, so is that power.
- Recommended: turn on two-factor sign-in for Ryan's account (Supabase Auth MFA) before this ships. Product/Legal decide if it's required.
- The admin functions check `is_app_admin()` on the server, so hiding the screen isn't the only protection.

**Not included (each would need its own approval):**
- seeing any member's data;
- editing teams, programs or accounts;
- deleting users;
- impersonation;
- analytics.

## Changes the approvals would need
1. **CLAUDE.md:** remove or replace "Don't build any in-app admin control for verification."
2. **Compliance T3.3:** for example, "writable only by the service role or by an admin through the audited admin functions."
3. **Compliance T4:** add rows for `app_admins` and `admin_actions`.
4. **Privacy notice (Legal to decide):** whether Part A or A2 should mention that the operator can see trainer team names and client counts. This is likely already covered, since we run the service.
5. **Version:** a 2.3.x number (2.3.1 is taken by custom exercises; the AI release also needs a number).

## Questions for the owner
- Besides opening and pausing trainer teams, what else should the dashboard handle? Each item will be scoped and approved separately.
- Should two-factor sign-in be required for the admin account?
