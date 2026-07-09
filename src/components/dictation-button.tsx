import { Pressable, StyleSheet, View } from 'react-native';

import { MicIcon } from '@/components/icons';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export interface DictationButtonProps {
  isListening: boolean;
  onPress: () => void;
}

/** Mic toggle for on-device dictation, in the Wishing Seed icon style. */
export function DictationButton({ isListening, onPress }: DictationButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isListening ? 'Stop dictation' : 'Dictate your dream'}
      accessibilityState={{ selected: isListening }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isListening ? theme.danger : theme.primary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {isListening ? <View style={styles.stop} /> : <MicIcon size={26} color="#FFFFFF" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  stop: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
