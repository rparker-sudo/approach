import { Alert, AlertButton, Platform, Share } from 'react-native';

/**
 * Alert.alert works on iPhone but does nothing in a web browser, and browser
 * pop-ups (window.confirm) can be blocked when the page is embedded. On web we
 * show our own in-app dialog instead (rendered by <DialogHost />).
 */

export type DialogRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  /** Text shown in a selectable box so the user can copy it. */
  copyText?: string;
};

type Listener = (d: DialogRequest | null) => void;
let listener: Listener | null = null;

export function setDialogListener(l: Listener | null) {
  listener = l;
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];
  if (listener) listener({ title, message, buttons: list });
  else if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
}

/** Share text: native share sheet, the browser share sheet, or a copy box. */
export async function shareText(message: string, title?: string) {
  if (Platform.OS !== 'web') {
    await Share.share({ message });
    return;
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  try {
    if (nav?.share) {
      await nav.share({ title, text: message });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return; // user closed the share sheet
  }
  let copied = false;
  try {
    await nav?.clipboard?.writeText(message);
    copied = true;
  } catch {
    copied = false;
  }
  listener?.({
    title: copied ? 'Program copied' : 'Copy this program',
    message: copied
      ? 'Paste it into a text or email to your athlete.'
      : 'Select all the text below, copy it, and send it to your athlete.',
    buttons: [{ text: 'Done' }],
    copyText: copied ? undefined : message,
  });
}
