/**
 * 2.4.0 Training v3 feature flags (spec "Build plan"). Build-time constants: each defaults on only when its part's
 * acceptance criteria pass (`reports/training-v3-acceptance.md`); off hides the feature cleanly.
 *  - catalogV3: the remaining 51 catalog v3 exercises, the 5 equipment items, link updates, Olympic derivatives by level,
 *    and movement-ladder resolution (exercise-catalog-v3.md, program-design §8a).
 *  - rackRotation: the Rack rotation session format (program-design §4b).
 *  - generatorV3: the v3 volleyball generator (program-design §1–§9). Off = the 2.3.0 generator, unchanged.
 */
export const FLAGS = {
  catalogV3: true,
  rackRotation: true,
  generatorV3: true,
};
