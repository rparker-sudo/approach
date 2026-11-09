import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { DialogRequest, setDialogListener } from '../lib/dialog';
import { BRAND, colors, Text, TextInput } from './ui';

/** In-app replacement for Alert.alert on web. Mounted once at the root. */
export default function DialogHost() {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  useEffect(() => {
    setDialogListener(setDialog);
    return () => setDialogListener(null);
  }, []);

  if (!dialog) return null;
  const close = () => setDialog(null);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          accessibilityRole="alert"
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.card,
            borderRadius: BRAND.radius.lg,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 20,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '600' }}>{dialog.title}</Text>
          {dialog.message ? <Text style={{ fontSize: 16, color: colors.muted, lineHeight: 22 }}>{dialog.message}</Text> : null}
          {dialog.copyText ? (
            <TextInput
              multiline
              editable={false}
              selectTextOnFocus
              value={dialog.copyText}
              style={{ height: 120, fontSize: 12 }}
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {dialog.buttons.map((b, i) => {
              const cancel = b.style === 'cancel';
              const destructive = b.style === 'destructive';
              const primary = !cancel && !destructive;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  onPress={() => {
                    close();
                    b.onPress?.();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: BRAND.radius.md,
                    alignItems: 'center',
                    backgroundColor: primary ? colors.primaryBg : 'transparent',
                    borderWidth: 1,
                    borderColor: destructive ? colors.error : primary ? colors.primaryBg : colors.line,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: destructive ? colors.error : primary ? colors.primaryText : colors.ink,
                    }}
                  >
                    {b.text ?? 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
