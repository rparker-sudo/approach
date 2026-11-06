import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Athlete, BodyLog, Profile, Program, TouchLog, WorkoutLog } from './types';
import { uid } from './util';

const KEY = 'volley-strength/data/v1';

const EMPTY: AppData = {
  version: 1,
  profile: null,
  programs: [],
  activeProgramId: null,
  logs: [],
  bodyLogs: [],
  athletes: [],
};

type Store = {
  ready: boolean;
  data: AppData;
  activeProgram: Program | null;
  setProfile: (p: Profile) => void;
  saveProgram: (p: Program, makeActive?: boolean) => void;
  deleteProgram: (id: string) => void;
  setActiveProgram: (id: string | null) => void;
  addLog: (l: WorkoutLog) => void;
  deleteLog: (id: string) => void;
  addBodyLog: (b: BodyLog) => void;
  saveAthlete: (a: Athlete) => void;
  deleteAthlete: (id: string) => void;
  resetAll: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  addTouchLog: (t: TouchLog) => void;
  deleteTouchLog: (date: string) => void;
  setNetHeight: (inches: number) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as AppData;
          setData({ ...EMPTY, ...parsed });
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const store = useMemo<Store>(
    () => ({
      ready,
      data,
      activeProgram: data.programs.find((p) => p.id === data.activeProgramId) ?? null,
      setProfile: (profile) => update((d) => ({ ...d, profile })),
      saveProgram: (p, makeActive) =>
        update((d) => {
          const exists = d.programs.some((x) => x.id === p.id);
          const programs = exists ? d.programs.map((x) => (x.id === p.id ? p : x)) : [p, ...d.programs];
          return { ...d, programs, activeProgramId: makeActive ? p.id : d.activeProgramId };
        }),
      deleteProgram: (id) =>
        update((d) => ({
          ...d,
          programs: d.programs.filter((p) => p.id !== id),
          activeProgramId: d.activeProgramId === id ? null : d.activeProgramId,
          athletes: d.athletes.map((a) => (a.programId === id ? { ...a, programId: null } : a)),
        })),
      setActiveProgram: (id) => update((d) => ({ ...d, activeProgramId: id })),
      addLog: (l) => update((d) => ({ ...d, logs: [l, ...d.logs] })),
      deleteLog: (id) => update((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) })),
      addBodyLog: (b) =>
        update((d) => ({
          ...d,
          bodyLogs: [...d.bodyLogs.filter((x) => x.date.slice(0, 10) !== b.date.slice(0, 10)), b].sort((a, z) =>
            a.date.localeCompare(z.date),
          ),
          profile: d.profile ? { ...d.profile, bodyWeightLb: b.weightLb } : d.profile,
        })),
      saveAthlete: (a) =>
        update((d) => {
          const exists = d.athletes.some((x) => x.id === a.id);
          return { ...d, athletes: exists ? d.athletes.map((x) => (x.id === a.id ? a : x)) : [...d.athletes, a] };
        }),
      deleteAthlete: (id) => update((d) => ({ ...d, athletes: d.athletes.filter((a) => a.id !== id) })),
      resetAll: () => setData((d) => ({ ...EMPTY, theme: d.theme })),
      setTheme: (theme) => update((d) => ({ ...d, theme })),
      addTouchLog: (t) => update((d) => ({ ...d, touchLogs: [...(d.touchLogs ?? []), t] })),
      deleteTouchLog: (date) => update((d) => ({ ...d, touchLogs: (d.touchLogs ?? []).filter((x) => x.date !== date) })),
      setNetHeight: (netHeightIn) => update((d) => ({ ...d, netHeightIn })),
    }),
    [data, ready, update],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/* ---------- Sharing programs between coach and athletes ---------- */

const SHARE_PREFIX = 'VSPROGRAM1:';

export function encodeProgram(p: Program): string {
  return SHARE_PREFIX + JSON.stringify(p);
}

/** Accepts the full shared message; finds the program code inside it. */
export function decodeProgram(text: string): Program | null {
  const at = text.indexOf(SHARE_PREFIX);
  if (at < 0) return null;
  const json = text.slice(at + SHARE_PREFIX.length).trim();
  try {
    const p = JSON.parse(json) as Program;
    if (!p || !Array.isArray(p.sessions) || !Array.isArray(p.liftSchedule) || p.liftSchedule.length !== 7) return null;
    // Give imported programs a fresh id so re-importing makes a copy.
    return { ...p, id: uid(), createdAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
