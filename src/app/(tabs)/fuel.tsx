import { useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Card, Chip, ChipRow, colors, H1, H2, Label, Row, Screen } from '../../components/ui';
import { FOOD_IDEAS, fuelDay, fuelTargets, NUTRITION_DISCLAIMER } from '../../lib/nutrition';
import { useStore } from '../../lib/store';
import type { DayType } from '../../lib/types';
import { weekdayIndex } from '../../lib/util';

const OPTIONS: { id: string; day: DayType; lift: boolean; label: string }[] = [
  { id: 'rest', day: 'off', lift: false, label: 'Rest' },
  { id: 'lift', day: 'off', lift: true, label: 'Lift only' },
  { id: 'practice', day: 'practice', lift: false, label: 'Practice' },
  { id: 'practice-lift', day: 'practice', lift: true, label: 'Practice + lift' },
  { id: 'game', day: 'game', lift: false, label: 'Match' },
  { id: 'tournament', day: 'tournament', lift: false, label: 'Tournament' },
];

export default function Fuel() {
  const { data, activeProgram } = useStore();
  const coach = data.profile?.role === 'coach';
  const i = weekdayIndex();
  const todayDay = activeProgram?.volleyballWeek[i] ?? 'practice';
  const todayLift = !!activeProgram?.liftSchedule[i];
  const todayId =
    OPTIONS.find((o) => o.day === todayDay && (o.day === 'game' || o.day === 'tournament' || o.lift === todayLift))?.id ?? 'practice';
  const [sel, setSel] = useState(todayId);
  const opt = OPTIONS.find((o) => o.id === sel)!;
  const nextDay = activeProgram?.volleyballWeek[(i + 1) % 7];
  const matchTomorrow = !coach && sel === todayId && (nextDay === 'game' || nextDay === 'tournament');
  const fuel = fuelDay(opt.day, opt.lift, matchTomorrow);
  const targets = coach ? null : fuelTargets(fuel, data.profile?.bodyWeightLb ?? null);

  return (
    <Screen tab>
      <H1>Fuel</H1>
      <Body muted>What to eat and drink changes with the kind of day you have.</Body>
      <ChipRow>
        {OPTIONS.map((o) => (
          <Chip key={o.id} label={o.id === todayId && !coach ? `${o.label} (today)` : o.label} selected={sel === o.id} onPress={() => setSel(o.id)} />
        ))}
      </ChipRow>

      <Card>
        <H2>{fuel.title}</H2>
        <Body muted>{fuel.summary}</Body>
        {targets ? (
          <View style={{ gap: 8 }}>
            <Target label="Carbohydrates" value={`${targets.carbsG[0]}–${targets.carbsG[1]} g`} hint="Main fuel for jumping and quick moves" />
            <Target label="Protein" value={`${targets.proteinG[0]}–${targets.proteinG[1]} g`} hint={`Spread out: about ${targets.proteinPerMealG[0]}–${targets.proteinPerMealG[1]} g per meal`} />
            <Target label="Fluids" value={`${targets.fluidsOz[0]}–${targets.fluidsOz[1]} oz`} hint="Pale-yellow urine means you're on track" />
          </View>
        ) : (
          <Body muted style={{ fontSize: 13 }}>
            {coach
              ? 'Athletes see personal gram targets based on their body weight.'
              : 'Add your body weight in Settings to see personal gram targets.'}
          </Body>
        )}
      </Card>

      <Card>
        <H2>Build your plate</H2>
        <PlateBar plate={fuel.plate} />
        <Row style={{ alignItems: 'flex-start', gap: 8 }}>
          <FoodCol title="Carbs" color={colors.accent} items={FOOD_IDEAS.carbs} />
          <FoodCol title="Protein" color={colors.navy} items={FOOD_IDEAS.protein} />
          <FoodCol title="Fruit & veg" color={colors.good} items={FOOD_IDEAS.veg} />
        </Row>
      </Card>

      <Card>
        <H2>Timing</H2>
        {fuel.timing.map((t, k) => (
          <View key={k} style={{ gap: 2, paddingVertical: 4 }}>
            <Text style={{ fontWeight: '700', color: colors.ink }}>{t.when}</Text>
            <Body muted style={{ fontSize: 14 }}>{t.what}</Body>
          </View>
        ))}
      </Card>

      <Body muted style={{ fontSize: 12 }}>{NUTRITION_DISCLAIMER}</Body>
    </Screen>
  );
}

function Target({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>{label}</Label>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{value}</Text>
      </Row>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{hint}</Text>
    </View>
  );
}

function PlateBar({ plate }: { plate: { carbs: number; protein: number; veg: number } }) {
  const parts = [
    { k: 'Carbs', v: plate.carbs, c: colors.accent },
    { k: 'Protein', v: plate.protein, c: colors.navy },
    { k: 'Fruit & veg', v: plate.veg, c: colors.good },
  ];
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden' }}>
        {parts.map((p) => (
          <View key={p.k} style={{ flex: p.v, backgroundColor: p.c, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{Math.round(p.v * 100)}%</Text>
          </View>
        ))}
      </View>
      <Body muted style={{ fontSize: 13 }}>
        Approximate share of your plate at main meals for this kind of day.
      </Body>
    </View>
  );
}

function FoodCol({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{title}</Text>
      {items.map((x) => (
        <Text key={x} style={{ fontSize: 13, color: colors.ink }}>
          {x}
        </Text>
      ))}
    </View>
  );
}
