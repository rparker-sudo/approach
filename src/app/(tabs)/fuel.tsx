import { useState } from 'react';
import { View } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import { Body, Card, Chip, ChipRow, colors, H2, Label, Row, Screen, Text } from '../../components/ui';
import { cardsFor, FOOD_IDEAS, FUEL_CARD_NOTE, FuelCard, fuelDay, NUTRITION_DISCLAIMER } from '../../lib/nutrition';
import { addDays, dayTypeOn, planForDate, today } from '../../lib/calendar';
import { useStore } from '../../lib/store';
import type { DayType } from '../../lib/types';

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
  const day = today();
  const todayPlan = activeProgram ? planForDate(activeProgram, day) : null;
  const todayDay = todayPlan?.dayType ?? 'practice';
  const todayLift = !!todayPlan?.sessionId;
  const todayId =
    OPTIONS.find((o) => o.day === todayDay && (o.day === 'game' || o.day === 'tournament' || o.lift === todayLift))?.id ?? 'practice';
  const [sel, setSel] = useState(todayId);
  const opt = OPTIONS.find((o) => o.id === sel)!;
  const nextDay = activeProgram ? dayTypeOn(activeProgram, addDays(day, 1)) : undefined;
  const matchTomorrow = !coach && sel === todayId && (nextDay === 'game' || nextDay === 'tournament');
  const fuel = fuelDay(opt.day, opt.lift, matchTomorrow);
  const cards = cardsFor(opt.day, opt.lift, matchTomorrow);

  return (
    <Screen tab>
      <ScreenHeader title="Fuel" subtitle="Meals and hydration" />
      <Body muted>Bigger day, more fuel. Pick the day to see the plan.</Body>
      <ChipRow>
        {OPTIONS.map((o) => (
          <Chip key={o.id} label={o.id === todayId && !coach ? `${o.label} (today)` : o.label} selected={sel === o.id} onPress={() => setSel(o.id)} />
        ))}
      </ChipRow>

      <Card>
        <H2>{fuel.title}</H2>
        <Body muted>{fuel.summary}</Body>
      </Card>

      <Card>
        <H2>Build your plate</H2>
        <PlateBar plate={fuel.plate} />
        <Row style={{ alignItems: 'flex-start', gap: 8 }}>
          <FoodCol title="Carbs" swatch={PLATE.carbs} items={FOOD_IDEAS.carbs} />
          <FoodCol title="Protein" swatch={PLATE.protein} items={FOOD_IDEAS.protein} />
          <FoodCol title="Fruit & veg" swatch={PLATE.veg} items={FOOD_IDEAS.veg} />
        </Row>
      </Card>

      <Card>
        <H2>Timing</H2>
        {fuel.timing.map((t, k) => (
          <View key={k} style={{ gap: 2, paddingVertical: 4 }}>
            <Text style={{ fontWeight: '600' }}>{t.when}</Text>
            <Body muted style={{ fontSize: 13 }}>{t.what}</Body>
          </View>
        ))}
      </Card>

      <Label>{sel === todayId && !coach ? 'For today' : 'For this day'}</Label>
      {cards.today.map((c) => (
        <FuelCardView key={c.id} card={c} />
      ))}
      <Label>More fuel tips</Label>
      {cards.rest.map((c) => (
        <FuelCardView key={c.id} card={c} />
      ))}

      <Body muted style={{ fontSize: 12 }}>{NUTRITION_DISCLAIMER}</Body>
    </Screen>
  );
}

/** A Fuel card: title, short body, source line (12 px muted) and the note every card carries. */
function FuelCardView({ card }: { card: FuelCard }) {
  return (
    <Card style={{ gap: 6 }}>
      <H2>{card.title}</H2>
      <Body>{card.body}</Body>
      <Text style={{ fontSize: 12, color: colors.muted }}>{`Source: ${card.source}`}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{FUEL_CARD_NOTE}</Text>
    </Card>
  );
}

function PlateBar({ plate }: { plate: { carbs: number; protein: number; veg: number } }) {
  const parts = [
    { k: 'Carbs', v: plate.carbs, s: PLATE.carbs },
    { k: 'Protein', v: plate.protein, s: PLATE.protein },
    { k: 'Fruit & veg', v: plate.veg, s: PLATE.veg },
  ];
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
        {parts.map((p) => (
          <View key={p.k} style={{ flex: p.v, backgroundColor: p.s.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: p.s.fg, fontSize: 12, fontWeight: '600' }}>{Math.round(p.v * 100)}%</Text>
          </View>
        ))}
      </View>
      <Body muted style={{ fontSize: 13 }}>
        Approximate share of your plate at main meals for this kind of day.
      </Body>
    </View>
  );
}

/** Plate shares as tone steps (monochrome brand). Read at render so the theme applies. */
const PLATE = {
  get carbs() {
    return { bg: colors.primaryBg, fg: colors.primaryText };
  },
  get protein() {
    return { bg: colors.day.tournament, fg: colors.ink };
  },
  get veg() {
    return { bg: colors.raised, fg: colors.ink };
  },
};

function FoodCol({ title, swatch, items }: { title: string; swatch: { bg: string }; items: string[] }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Row style={{ gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: swatch.bg, borderWidth: 1, borderColor: colors.line }} />
        <Text style={{ fontWeight: '600', fontSize: 13 }}>{title}</Text>
      </Row>
      {items.map((x) => (
        <Text key={x} style={{ fontSize: 13 }}>
          {x}
        </Text>
      ))}
    </View>
  );
}
