import { useState } from 'react';
import { View } from 'react-native';
import { applyTrims, estimateSession, expressSession, fitSession, type FitCtx } from '../lib/fit';
import type { Session } from '../lib/types';
import Sheet from './Sheet';
import { Button, Card, colors, Row, Text } from './ui';

/**
 * F51f: an Approach-generated session over its target is fitted automatically. The coach sees one line per trim with
 * Undo (and Undo all). Undone trims are saved in `fitLog` as `undo:<step>`; nothing else changes, and the session stays
 * Approach's (§0.1: length changes don't make it coach-built).
 */
export function FitBanner({ session, target, ctx, onChange }: { session: Session; target: number; ctx: FitCtx; onChange: (s: Session) => void }) {
  const undone = (session.fitLog ?? []).filter((l) => l.startsWith('undo:')).map((l) => l.slice(5));
  const fit = fitSession(session, target, ctx, { skip: undone });
  if (!fit.trims.length && !undone.length && !fit.express) return null;
  const setUndone = (keys: string[]) => onChange({ ...session, fitLog: keys.map((k) => `undo:${k}`), targetMinutes: target });
  return (
    <Card style={{ gap: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: '700' }}>{`Fit to ${target} min`}</Text>
      {fit.express ? <Text style={{ fontSize: 13 }}>Short session: warm-up, power, main lift, and one superset.</Text> : null}
      {fit.trims.map((t) => (
        <Row key={t.key} style={{ justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 13, flex: 1 }}>{t.text}</Text>
          <Button small kind="ghost" title="Undo" accessibilityLabel={`Undo: ${t.text}`} onPress={() => setUndone([...undone, t.key])} />
        </Row>
      ))}
      {fit.trims.length > 1 ? <Button small kind="ghost" title="Undo all" onPress={() => setUndone([...undone, ...fit.trims.map((t) => t.key)])} /> : null}
      {undone.length ? (
        <Text accessibilityRole="button" onPress={() => setUndone([])} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
          Fit again
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * F51e: Fit to time for a coach-built session. Suggestions in Training's trim order; nothing changes until the coach
 * applies a row; Save is never affected. Applied rows show "Applied · Undo".
 */
export function FitSheet({ session, target, ctx, onChange, onClose }: { session: Session; target: number; ctx: FitCtx; onChange: (s: Session) => void; onClose: () => void }) {
  const [base] = useState<Session>(session);
  const [applied, setApplied] = useState<string[]>([]);
  const all = fitSession(base, target, ctx, { all: true });
  const now = estimateSession(base, ctx);
  const after = estimateSession(applyTrims(base, applied, ctx), ctx);
  const apply = (keys: string[]) => {
    setApplied(keys);
    onChange(applyTrims(base, keys, ctx));
  };
  function applyAll() {
    const keys: string[] = [];
    for (const t of all.trims) {
      keys.push(t.key);
      if (estimateSession(applyTrims(base, keys, ctx), ctx) <= target) break;
    }
    apply(keys);
  }
  const allApplied = estimateSession(applyTrims(base, all.trims.map((t) => t.key), ctx), ctx);
  return (
    <Sheet title={`Fit to ${target} min`} onClose={onClose}>
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{`about ${now} min → about ${after} after applied`}</Text>
      {all.trims.map((t) => {
        const on = applied.includes(t.key);
        return (
          <Card key={t.key} style={{ gap: 4 }}>
            <Text style={{ fontSize: 14 }}>{t.text}</Text>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.muted }}>{on ? 'Applied' : `−${Math.max(1, t.saved)} min`}</Text>
              {on ? (
                <Button small kind="ghost" title="Undo" accessibilityLabel={`Undo: ${t.text}`} onPress={() => apply(applied.filter((k) => k !== t.key))} />
              ) : (
                <Button small kind="secondary" title="Apply" accessibilityLabel={`Apply: ${t.text}`} onPress={() => apply([...applied, t.key])} />
              )}
            </Row>
          </Card>
        );
      })}
      {!all.trims.length ? <Text style={{ fontSize: 13, color: colors.muted }}>No trims to suggest for this session.</Text> : null}
      {allApplied > target ? (
        <Card style={{ gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{`Still about ${allApplied} min after all trims. Approach Strength's shortest version is an Express session.`}</Text>
          <Button small kind="secondary" title="Make it Express" onPress={() => onChange(expressSession(base))} />
        </Card>
      ) : null}
      <View style={{ gap: 8 }}>
        {all.trims.length ? <Button kind="secondary" title="Apply all" onPress={applyAll} /> : null}
        <Button title="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}
