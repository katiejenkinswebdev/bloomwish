import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export type ScreenProps = ViewProps & {
  scrollable?: boolean;
  padded?: boolean;
};

export function Screen({ style, padded = true, children, ...rest }: ScreenProps) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={[styles.fill, styles.column, padded && styles.padded, style]} {...rest}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: Spacing.four,
  },
});
