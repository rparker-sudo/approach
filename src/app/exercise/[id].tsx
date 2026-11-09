import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Body, Card, colors, H2, Icon, Label, Pill, Row, Screen, Text } from '../../components/ui';
import { CATEGORY_LABEL, EQUIPMENT, getExercise } from '../../lib/exercises';

/** How to do an exercise: why it matters, steps, cues, mistakes, equipment, easier/harder options. */
export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = getExercise(id);
  const label = (e: string) => EQUIPMENT.find((x) => x.id === e)?.label ?? e;
  const setups = ex.equipment.map((s) => (s.length ? s.map(label).join(' + ') : 'No equipment'));

  return (
    <Screen>
      <Stack.Screen options={{ title: ex.name }} />
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill text={CATEGORY_LABEL[ex.category]} />
        <Pill text={ex.level === 1 ? 'Beginner-friendly' : ex.level === 2 ? 'Some experience' : 'Experienced lifters'} />
      </Row>
      {ex.howTo.why ? <Body>{ex.howTo.why}</Body> : null}

      <Section title="How to do it">
        {ex.howTo.steps.map((step, i) => (
          <Row key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ fontWeight: '600', width: 20 }}>{i + 1}.</Text>
            <Text style={{ flex: 1, lineHeight: 22 }}>{step}</Text>
          </Row>
        ))}
      </Section>

      <Section title="Coaching cues">
        {ex.howTo.cues.map((c, i) => (
          <Text key={i} style={{ lineHeight: 22 }}>• {c}</Text>
        ))}
      </Section>

      <Section title="Common mistakes">
        {ex.howTo.mistakes.map((m, i) => (
          <Text key={i} style={{ lineHeight: 22, color: colors.muted }}>• {m}</Text>
        ))}
      </Section>

      <Section title="Equipment">
        {setups.map((s, i) => (
          <Text key={i}>{setups.length > 1 ? `Option ${i + 1}: ` : ''}{s}</Text>
        ))}
      </Section>

      {ex.easier || ex.harder ? (
        <View style={{ gap: 8 }}>
          <Label>Make it easier or harder</Label>
          {ex.easier ? <Link label="Easier" id={ex.easier} /> : null}
          {ex.harder ? <Link label="Harder" id={ex.harder} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 8 }}>
      <Label>{title}</Label>
      {children}
    </Card>
  );
}

function Link({ label, id }: { label: string; id: string }) {
  const ex = getExercise(id);
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${id}`)}>
      <Card style={{ padding: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
            <Text style={{ fontWeight: '600', fontSize: 16 }}>{ex.name}</Text>
          </View>
          <Icon name="chevron.right" size={14} color={colors.faint} />
        </Row>
      </Card>
    </Pressable>
  );
}
