import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { backend } from '../lib/backend';
import type { WarmupTemplate } from '../lib/backend/types';
import { showAlert } from '../lib/dialog';
import { exercisePool, getExercise } from '../lib/exercises';
import {
  buildWarmup,
  isSessionWarmup,
  PART_TITLE,
  SESSION_TYPE_LABEL,
  sessionType,
  WARMUP_PARTS,
  warmupFor,
  warmupMinutes,
  warmupName,
  type WarmupCtx,
  type WarmupPart,
} from '../lib/warmup';
import type { ProgramExercise, Session, SessionWarmup } from '../lib/types';
import Sheet from './Sheet';
import { Body, Button, Card, colors, Field, H2, Label, Row, Text, TextInput, Toggle } from './ui';

type Items = Pick<SessionWarmup, WarmupPart>;
const POOL_IDS: Record<WarmupPart, string[]> = {
  raise: ['high-knees', 'a-skip', 'lateral-shuffle', 'carioca', 'walking-knee-hug', 'walking-quad-stretch'],
  activate: [
    'ankle-rock', 'hip-90-90', 'worlds-greatest', 'band-lateral-walk', 'glute-bridge', 'bodyweight-squat', 'leg-swings', 'inchworm', 'cat-camel',
    'bird-dog', 'band-hamstring', 'lateral-lunge', 'short-lever-copenhagen', 'ankle-balance', 'hip-flexor-stretch', 'arm-circles', 'scap-pushup',
    'push-up-plus', 'thoracic-rotation', 'band-pull-apart', 'wall-slide', 'lat-reach', 'band-er', 'er-90-90-iso', 'soleus-calf-raise', 'wrist-roller',
  ],
  potentiate: ['pogo', 'cmj', 'skater-hop', 'line-hops', 'bodyweight-squat', 'pushup', 'mb-chest-pass', 'box-jump', 'squat-jump', 'broad-jump'],
};

/**
 * F49: the Warm-up row pinned at the top of the session editor, with Edit and ⋯ (Regenerate, Save as template, Use a
 * template, Remove). Warm-up changes never make a session coach-built (§0.1): `onChange` saves the session as it is.
 */
export default function WarmupRow({
  session,
  ctx,
  teamId,
  general,
  onChange,
}: {
  session: Session;
  ctx: WarmupCtx;
  teamId?: string;
  general: boolean;
  onChange: (s: Session) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [templates, setTemplates] = useState<WarmupTemplate[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const shown = warmupFor(session, ctx);
  const w = session.warmup;
  const removed = session.warmup === null || (isSessionWarmup(w) && w.edited && !w.raise.length && !w.activate.length && !w.potentiate.length);
  const type = SESSION_TYPE_LABEL[sessionType(session)];
  const minutes = warmupMinutes(shown, ctx);
  const tag = removed ? 'None' : shown?.source === 'template' ? `Template: ${isSessionWarmup(w) ? w.template : ''}` : shown?.source === 'edited' ? 'Edited' : 'Approach Strength';
  const limitedSpace = isSessionWarmup(w) && typeof w.limitedSpace === 'boolean' ? w.limitedSpace : !!ctx.limitedSpace;

  useEffect(() => {
    if (!teamId || (!picking && naming == null)) return;
    let alive = true;
    backend.listWarmupTemplates(teamId).then((t) => alive && setTemplates(t)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [teamId, picking, naming]);

  function regenerate() {
    const go = () => onChange({ ...session, warmup: limitedSpace !== !!ctx.limitedSpace ? { raise: [], activate: [], potentiate: [], limitedSpace } : undefined });
    if (shown?.source === 'edited' || shown?.source === 'template') {
      showAlert('Regenerate the warm-up?', 'Replace your warm-up with a new one built from this session?', [
        { text: 'Keep mine', style: 'cancel' },
        { text: 'Regenerate', onPress: go },
      ]);
    } else go();
  }
  function remove() {
    showAlert('Remove the warm-up?', 'Remove the warm-up from this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange({ ...session, warmup: null }) },
    ]);
  }
  function applyTemplate(t: WarmupTemplate) {
    const go = () => {
      onChange({ ...session, warmup: { ...t.items, template: t.name, limitedSpace } });
      setPicking(false);
    };
    if (shown?.source === 'edited') {
      showAlert('Use this template?', 'Replace your edited warm-up with this template?', [
        { text: 'Keep mine', style: 'cancel' },
        { text: 'Use', onPress: go },
      ]);
    } else go();
  }
  async function saveTemplate(name: string) {
    if (!teamId || !shown) return;
    try {
      await backend.saveWarmupTemplate(teamId, name, { raise: shown.raise, activate: shown.activate, potentiate: shown.potentiate });
      setNaming(null);
      setToast('Template saved.');
    } catch (e) {
      showAlert("Couldn't save the template.", e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <Card style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{removed ? 'No warm-up' : `Warm-up · ${type} · about ${minutes} min`}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 8, alignSelf: 'flex-start' }}>{tag}</Text>
        </View>
        {!removed ? <Button small kind="ghost" title="Edit" onPress={() => setEditing(true)} /> : null}
        <Button small kind="ghost" title="⋯" accessibilityLabel="Warm-up options" onPress={() => setMenu(true)} />
      </Row>
      {removed ? (
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button small kind="secondary" title="Add warm-up" onPress={() => onChange({ ...session, warmup: undefined })} />
          </View>
          {teamId ? (
            <View style={{ flex: 1 }}>
              <Button small kind="ghost" title="Use a template" onPress={() => setPicking(true)} />
            </View>
          ) : null}
        </Row>
      ) : null}
      {toast ? <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.muted }}>{toast}</Text> : null}

      {menu ? (
        <Sheet title="Warm-up" onClose={() => setMenu(false)}>
          <Button kind="ghost" title="Regenerate" onPress={() => { setMenu(false); regenerate(); }} />
          {teamId && shown ? <Button kind="ghost" title="Save as template" onPress={() => { setMenu(false); setNaming(''); }} /> : null}
          {teamId ? <Button kind="ghost" title="Use a template" onPress={() => { setMenu(false); setPicking(true); }} /> : null}
          {!removed ? <Button kind="danger" title="Remove" onPress={() => { setMenu(false); remove(); }} /> : null}
        </Sheet>
      ) : null}

      {naming != null ? (
        <Sheet title="Save as template" onClose={() => setNaming(null)}>
          <Field label="Template name" placeholder="Our lower warm-up" maxLength={60} value={naming} onChangeText={setNaming} />
          <Body muted style={{ fontSize: 13 }}>{general ? 'Only you see your templates.' : 'Templates are saved for this team.'}</Body>
          <Button title="Save" disabled={!naming.trim()} onPress={() => saveTemplate(naming)} />
        </Sheet>
      ) : null}

      {picking ? (
        <Sheet title="Use a template" onClose={() => setPicking(false)}>
          {templates.length ? (
            templates.map((t) => (
              <Card key={t.id} style={{ gap: 4 }}>
                <Text style={{ fontWeight: '600', fontSize: 15 }}>{t.name}</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {WARMUP_PARTS.map((p) => `${PART_TITLE[p]}: ${t.items[p].map(warmupName).join(', ') || '—'}`).join(' · ')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{`${WARMUP_PARTS.reduce((n, p) => n + t.items[p].length, 0)} items`}</Text>
                <Button small title="Use" onPress={() => applyTemplate(t)} />
              </Card>
            ))
          ) : (
            <Body muted>Save a warm-up as a template first.</Body>
          )}
        </Sheet>
      ) : null}

      {editing && shown ? (
        <WarmupEditorSheet
          initial={{ raise: shown.raise, activate: shown.activate, potentiate: shown.potentiate }}
          limitedSpace={limitedSpace}
          ctx={ctx}
          session={session}
          general={general}
          onCancel={() => setEditing(false)}
          onSave={(items, limited) => {
            onChange({ ...session, warmup: { ...items, edited: true, limitedSpace: limited } });
            setEditing(false);
          }}
        />
      ) : null}
    </Card>
  );
}

/** The full-screen editor: three parts, rows with a prescription field, Swap, Remove, move up/down or to another part, + Add. */
function WarmupEditorSheet({
  initial,
  limitedSpace,
  ctx,
  session,
  general,
  onCancel,
  onSave,
}: {
  initial: Items;
  limitedSpace: boolean;
  ctx: WarmupCtx;
  session: Session;
  general: boolean;
  onCancel: () => void;
  onSave: (items: Items, limitedSpace: boolean) => void;
}) {
  const [items, setItems] = useState<Items>(initial);
  const [limited, setLimited] = useState(limitedSpace);
  const [picker, setPicker] = useState<{ part: WarmupPart; index: number | null } | null>(null);
  const [customDraft, setCustomDraft] = useState<{ part: WarmupPart; name: string; reps: string } | null>(null);
  const minutes = warmupMinutes({ ...items }, ctx);

  const setPart = (part: WarmupPart, list: ProgramExercise[]) => setItems((cur) => ({ ...cur, [part]: list }));
  function move(part: WarmupPart, i: number, dir: -1 | 1) {
    const list = [...items[part]];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setPart(part, list);
  }
  function toPart(part: WarmupPart, i: number, dest: WarmupPart) {
    const pe = items[part][i];
    setItems((cur) => ({ ...cur, [part]: cur[part].filter((_, k) => k !== i), [dest]: [...cur[dest], pe] }));
  }
  function pick(id: string) {
    if (!picker) return;
    const row: ProgramExercise = { exerciseId: id, sets: 1, reps: picker.part === 'raise' ? '2 × 10 yd' : '8', effort: 'Easy' };
    const list = [...items[picker.part]];
    if (picker.index == null) list.push(row);
    else list[picker.index] = { ...row, reps: list[picker.index].reps };
    setPart(picker.part, list);
    setPicker(null);
  }
  function limitedChanged(v: boolean) {
    setLimited(v);
    // Swap Raise drills to (or from) their in-place version when they're Approach's.
    const regen = buildWarmup(session, { ...ctx, limitedSpace: v });
    setItems((cur) => ({ ...cur, raise: cur.raise.map((r) => regen.raise.find((x) => x.exerciseId === r.exerciseId) ?? r) }));
  }

  const pool = exercisePool(general);
  const library = picker ? pool.filter((e) => !e.durationOnly || picker.part === 'raise') : [];
  const first = picker ? POOL_IDS[picker.part].map((id) => getExercise(id)).filter((e) => e.howTo.steps.length) : [];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <H2>Edit warm-up</H2>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600' }}>Limited space</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>In-place Raise drills.</Text>
            </View>
            <Toggle accessibilityLabel="Limited space" value={limited} onValueChange={limitedChanged} />
          </Row>
          {WARMUP_PARTS.map((part) => (
            <Card key={part} style={{ gap: 8 }}>
              <Label>{PART_TITLE[part]}</Label>
              {!items[part].length ? <Text style={{ fontSize: 13, color: colors.muted }}>{`No ${PART_TITLE[part]} items.`}</Text> : null}
              {items[part].map((pe, i) => (
                <View key={`${part}-${i}`} style={{ gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, paddingTop: i ? 8 : 0 }}>
                  <Row style={{ justifyContent: 'space-between', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', flex: 1 }}>{warmupName(pe)}</Text>
                    <Button small kind="ghost" title="↑" accessibilityLabel={`Move ${warmupName(pe)} up`} disabled={i === 0} onPress={() => move(part, i, -1)} />
                    <Button small kind="ghost" title="↓" accessibilityLabel={`Move ${warmupName(pe)} down`} disabled={i === items[part].length - 1} onPress={() => move(part, i, 1)} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${warmupName(pe)}`}
                      onPress={() => setPart(part, items[part].filter((_, k) => k !== i))}
                      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 18 }}>×</Text>
                    </Pressable>
                  </Row>
                  <TextInput
                    accessibilityLabel={`Prescription for ${warmupName(pe)}`}
                    value={pe.reps}
                    placeholder="8 each"
                    placeholderTextColor={colors.faint}
                    onChangeText={(t) => setPart(part, items[part].map((x, k) => (k === i ? { ...x, reps: t } : x)))}
                  />
                  <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                    {!pe.customName ? <Button small kind="ghost" title="Swap" onPress={() => setPicker({ part, index: i })} /> : null}
                    {WARMUP_PARTS.filter((p) => p !== part).map((p) => (
                      <Button key={p} small kind="ghost" title={`To ${PART_TITLE[p]}`} onPress={() => toPart(part, i, p)} />
                    ))}
                  </Row>
                </View>
              ))}
              <Row style={{ gap: 6 }}>
                <View style={{ flex: 1 }}>
                  <Button small kind="secondary" title="+ Add" onPress={() => setPicker({ part, index: null })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button small kind="ghost" title="Custom item" onPress={() => setCustomDraft({ part, name: '', reps: '' })} />
                </View>
              </Row>
            </Card>
          ))}
          <Text style={{ fontSize: 14, fontWeight: '600' }}>{`about ${minutes} min`}</Text>
          <Row style={{ gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" title="Cancel" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Save" onPress={() => onSave(items, limited)} />
            </View>
          </Row>
        </ScrollView>
      </View>
      {picker ? (
        <Sheet title={picker.index == null ? `Add to ${PART_TITLE[picker.part]}` : 'Swap'} onClose={() => setPicker(null)}>
          <Label>{`${PART_TITLE[picker.part]} pool`}</Label>
          {first.map((e) => (
            <Pressable key={`p-${e.id}`} accessibilityRole="button" onPress={() => pick(e.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontSize: 15 }}>{e.name}</Text>
            </Pressable>
          ))}
          <Label>All exercises</Label>
          {library
            .filter((e) => !POOL_IDS[picker.part].includes(e.id))
            .map((e) => (
              <Pressable key={`a-${e.id}`} accessibilityRole="button" onPress={() => pick(e.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 15 }}>{e.name}</Text>
              </Pressable>
            ))}
        </Sheet>
      ) : null}
      {customDraft ? (
        <Sheet title="Custom item" onClose={() => setCustomDraft(null)}>
          <Field label="Name" maxLength={60} value={customDraft.name} onChangeText={(t) => setCustomDraft({ ...customDraft, name: t })} />
          <Field label="Prescription" placeholder="2 × 10 yd" maxLength={40} value={customDraft.reps} onChangeText={(t) => setCustomDraft({ ...customDraft, reps: t })} />
          <Button
            title="Add"
            disabled={!customDraft.name.trim()}
            onPress={() => {
              setPart(customDraft.part, [...items[customDraft.part], { exerciseId: 'warmup-item', customName: customDraft.name.trim(), sets: 1, reps: customDraft.reps.trim(), effort: 'Easy' }]);
              setCustomDraft(null);
            }}
          />
        </Sheet>
      ) : null}
    </Modal>
  );
}
