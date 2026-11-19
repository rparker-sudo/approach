import type { TeamSettings, WarmupTemplate } from './backend/types';
import type { Session, SessionWarmup } from './types';
import { isSessionWarmup } from './warmup';

/**
 * 2.4.0 F50: the team default warm-up ("Approach / My template / None") and the Limited space setting apply to new
 * sessions and sessions whose warm-up the coach hasn't edited. They're stamped into the session's `warmup` (inside the
 * posted program JSON) when the coach posts, marked `teamDefault`, so a later change of default replaces them.
 * A warm-up the coach edited, removed, or picked from a template themselves is never touched.
 */
export function withTeamWarmup(session: Session, settings: TeamSettings | undefined, template: WarmupTemplate | undefined): Session {
  if (!settings || session.light || session.mobility) return session;
  const w = session.warmup;
  if (w === null) return session; // the coach removed it
  if (isSessionWarmup(w) && !w.teamDefault && (w.edited || w.template)) return session;
  const limited = isSessionWarmup(w) && typeof w.limitedSpace === 'boolean' && !w.teamDefault ? w.limitedSpace : settings.limitedSpace;
  const mark = { teamDefault: true } as const;
  if (settings.defaultWarmup === 'none') {
    // An empty, fixed warm-up: the athlete sees no card (F47 "No warm-up").
    return { ...session, warmup: { raise: [], activate: [], potentiate: [], edited: true, ...mark } as SessionWarmup };
  }
  if (settings.defaultWarmup === 'template' && template) {
    return { ...session, warmup: { ...template.items, template: template.name, limitedSpace: limited, ...mark } as SessionWarmup };
  }
  // Approach: generated at resolve time; only the limited-space choice is carried.
  if (!limited) return { ...session, warmup: undefined };
  return { ...session, warmup: { raise: [], activate: [], potentiate: [], limitedSpace: true, ...mark } as SessionWarmup };
}
