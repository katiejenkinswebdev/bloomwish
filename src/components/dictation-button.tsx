import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export interface DictationButtonProps {
  isListening: boolean;
  onPress: () => void;
}

/**
 * Mic toggle for on-device dictation.
 * TODO(phase 8): replace the emoji glyph with brand iconography.
 */
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
      <ThemedText style={styles.glyph}>{isListening ? '◼' : '🎙️'}</ThemedText>
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
  glyph: {
    fontSize: 22,
    color: '#fff',
  },
});
