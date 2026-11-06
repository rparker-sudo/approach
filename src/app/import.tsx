import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Body, Button, colors, H2, Screen, TextInput } from '../components/ui';
import { decodeProgram, useStore } from '../lib/store';

export default function ImportScreen() {
  const { data, saveProgram } = useStore();
  const [text, setText] = useState('');
  const coach = data.profile?.role === 'coach';

  function doImport() {
    const program = decodeProgram(text);
    if (!program) {
      Alert.alert("Couldn't read that program", 'Copy the whole message your coach sent, then paste it again.');
      return;
    }
    saveProgram(program, !coach);
    Alert.alert('Program added', coach ? `"${program.name}" is in Plan.` : `"${program.name}" is now your active program.`);
    router.back();
  }

  return (
    <Screen>
      <H2>Paste the program your coach sent</H2>
      <Body muted>
        Open the message from your coach, press and hold it, choose Copy, then paste it below.
      </Body>
      <TextInput
        style={{ minHeight: 180, textAlignVertical: 'top', fontSize: 13 }}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="Paste here"
        placeholderTextColor={colors.faint}
        value={text}
        onChangeText={setText}
      />
      <Button title="Import program" icon="square.and.arrow.down" disabled={!text.trim()} onPress={doImport} />
    </Screen>
  );
}
