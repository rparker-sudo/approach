/** A check-in counts as "run down" when the average of sleep, energy and (inverted) soreness is ≤ 2, or soreness is 4–5. */
export function isLow(r: { sleep: number; energy: number; soreness: number }) {
  const avg = (r.sleep + r.energy + (6 - r.soreness)) / 3;
  return avg <= 2 || r.soreness >= 4;
}
