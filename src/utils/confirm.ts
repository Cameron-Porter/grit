import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * Alert.alert is non-functional on React Native Web — use window.confirm there.
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Confirm',
  destructive = false,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
