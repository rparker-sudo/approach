import type { GeneratedFormat } from './types';
import { autoAssign, type RackAthlete } from './racks';

/**
 * 2.4.2 Part B · "Your weight room" (planner §2a; spec B1–B3, D-065; UX F60). Pure functions; no React.
 * Athletes per session is a setup input only: never stored (spec B2, compliance § 2.4.2 check #1).
 */

export const STYLE_TEXT: Record<GeneratedFormat, { title: string; line: string }> = {
  standard: { title: 'Standard', line: 'Everyone works through their own sets.' },
  stations: { title: 'Stations', line: 'Groups rotate through stations.' },
  rack_rotation: { title: 'Rack rotation', line: 'Each group rotates at its rack.' },
};
export const STYLES: GeneratedFormat[] = ['standard', 'stations', 'rack_rotation'];

/** Spec B2 reasons (exact). */
export const STYLE_REASON = {
  noRacks: 'No racks, so groups rotate through equipment stations.',
  twoOrFewer: 'Two or fewer per rack, so everyone works through their own sets.',
  threeToFive: '3–5 per rack, so each group rotates at its rack and nobody waits.',
  sixPlus: 'More than 5 per rack, so groups move between racks and other stations.',
  short: 'Short sessions: the essentials only.',
};

export type StyleSuggestion = { style: GeneratedFormat; reason: string; perRack: number | null; express: boolean; math: string };

/** Spec B2: athletes per rack = athletes ÷ racks, rounded up (D-065); under 30 min adds Express. */
export function suggestStyle(racks: number, athletes: number, minutes: number): StyleSuggestion {
  const express = minutes < 30;
  if (racks <= 0) return { style: 'stations', reason: STYLE_REASON.noRacks, perRack: null, express, math: 'No racks or platforms.' };
  const exact = athletes / racks;
  const perRack = Math.ceil(exact);
  const math = `${athletes} athlete${athletes === 1 ? '' : 's'} ÷ ${racks} rack${racks === 1 ? '' : 's'} = ${perRack} per rack${Number.isInteger(exact) ? '' : ` (${Math.round(exact * 10) / 10}, rounded up)`}.`;
  if (perRack <= 2) return { style: 'standard', reason: STYLE_REASON.twoOrFewer, perRack, express, math };
  if (perRack <= 5) return { style: 'rack_rotation', reason: STYLE_REASON.threeToFive, perRack, express, math };
  return { style: 'stations', reason: STYLE_REASON.sixPlus, perRack, express, math };
}

/** §2d / D-068.3: the rotation layout for a rack size (≤ 2 → groups of 3; 6+ → groups of 5; 4 by default). */
export const layoutSize = (perRack: number | null | undefined): 3 | 4 | 5 => (perRack == null ? 4 : perRack <= 3 ? 3 : perRack >= 5 ? 5 : 4);

/** F60d info lines for a choice (never blocking). */
export function styleInfo(style: GeneratedFormat, racks: number, existingGroups: number, perRack: number | null): string[] {
  if (style === 'standard') return [];
  if (style === 'stations') {
    if (racks <= 0) return ['On the day, use Start stations to make groups.'];
    return [existingGroups ? 'Uses your rack groups as station groups.' : noneYet(racks, perRack)];
  }
  if (racks <= 0) return ['Needs at least 1 rack. Add racks above.'];
  const out: string[] = [];
  if (perRack != null && perRack <= 2) out.push(`${perRack} per rack: sessions use the groups-of-3 layout, so one position is open each turn.`);
  if (perRack != null && perRack >= 6) out.push(`${perRack} per rack: sessions use the groups-of-5 layout, and extra athletes share a non-rack position.`);
  out.push(existingGroups ? `Uses your ${existingGroups} rack group${existingGroups === 1 ? '' : 's'} as they are.` : noneYet(racks, perRack));
  return out;
}
const noneYet = (racks: number, perRack: number | null) =>
  `Rack groups: you have none yet. Building makes ${racks} rack${racks === 1 ? '' : 's'} of ${Math.min(5, Math.max(3, perRack ?? 4))} (balanced mix). You can edit them after in Team → Racks.`;

/**
 * Spec B3: Rack rotation with no rack groups creates them on Build, with the existing balanced-mix auto-assign (D-026: roster,
 * level and position only; neutral names). Each rack holds 3–5 athletes (§2d), so the rack count is lowered if needed.
 * Inputs: the roster entries only (no test results, loads, check-ins, bodyweight or age).
 */
export function makeRackGroups(athletes: RackAthlete[], racks: number): { name: string; userIds: string[] }[] {
  if (!athletes.length || racks <= 0) return [];
  const n = Math.max(1, Math.min(racks, Math.floor(athletes.length / 3) || 1));
  const need = Math.ceil(athletes.length / 5);
  const count = Math.max(n, Math.min(racks, need));
  return autoAssign(athletes, count, 'balanced').map((g, i) => ({ name: `Rack ${i + 1}`, userIds: g.map((a) => a.userId) }));
}
