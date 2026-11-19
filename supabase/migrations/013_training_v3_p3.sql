-- Approach Strength 2.4.0, Training v3 Part 3 (spec docs/specs/training-v3.md v1.0 §3.1; compliance V4).
-- Safe to run more than once. Run after 012_training_v3_p2.sql.
--
-- Generator v3 adds no table or column. Its program-content keys live inside the existing team_programs.program JSON
-- (compliance V4 / CLAUDE.md known conflict 7: Program.block, ProgramExercise.method, ProgramExercise.pct, slot ladders).
-- The athlete's coach-confirmed level (needed for contrast pairs, clusters, waves and depth jumps) is the existing
-- team_members.level_set_by (2.2; set = confirmed by the team's coach). This file records that Part 3 needs no schema change, so the upgrade steps stay
-- one file per part.
select 1 as training_v3_part3_no_schema_change;
