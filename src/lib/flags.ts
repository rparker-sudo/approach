/**
 * 2.4.0 Training v3 feature flags (spec "Build plan"). Build-time constants: each defaults on only when its part's
 * acceptance criteria pass (`reports/training-v3-acceptance.md`); off hides the feature cleanly.
 *  - catalogV3: the remaining 51 catalog v3 exercises, the 5 equipment items, link updates, Olympic derivatives by level,
 *    and movement-ladder resolution (exercise-catalog-v3.md, program-design §8a).
 *  - rackRotation: the Rack rotation session format (program-design §4b).
 *  - generatorV3: the v3 volleyball generator (program-design §1–§9). Off = the 2.3.0 generator, unchanged.
 *  - plannerV3 (2.4.2, D-068.6): program length planner, "Your weight room" step, rack-aware generation, coaching layer and
 *    cooldown, Today's racks (program-planner-v3.md; spec v2.4.2 Parts A–E). Off = the 2.4.1 builder and generator with no
 *    other change; none of F57–F62 or F64 render. Existing programs keep working either way.
 */
export const FLAGS = {
  catalogV3: true,
  rackRotation: true,
  generatorV3: true,
  plannerV3: true,
};
