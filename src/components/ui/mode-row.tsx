import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ModeRowProps {
  title: string;
  subtitle?: string;
  /** 24px-ish glyph shown in the 40px tonal circle on the left. */
  icon?: React.ReactNode;
  /** Small accessory on the right (spark, chevron, "NIGHT" tag…). */
  accessory?: React.ReactNode;
  /** Kicker line above the title (Feed cards use this). */
  kicker?: string;
  kickerColor?: string;
  /** 'plum' renders the deep-plum card (Drift row, rampage card) in day mode too. */
  tone?: 'default' | 'plum';
  onPress?: () => void;
  disabled?: boolean;
}

/** The list-row card of the redesign: water modes, feed acts, settings rows. */
export function ModeRow({
  title,
  subtitle,
  icon,
  accessory,
  kicker,
  kickerColor,
  tone = 'default',
  onPress,
  disabled,
}: ModeRowProps) {
  const theme = useTheme();
  const plum = tone === 'plum';
  const cardBg = plum ? BrandPalette.plum : theme.backgroundElement;
  const titleColor = plum ? BrandPalette.cream : theme.text;
  const subColor = plum ? '#C7B9CC' : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: cardBg, opacity: pressed ? 0.85 : 1 },
      ]}>
      {icon ? (
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: plum ? '#3B3050' : theme.backgroundSelected },
          ]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.body}>
        {kicker ? (
          <ThemedText type="micro" style={{ color: kickerColor ?? subColor }}>
            {kicker}
          </ThemedText>
        ) : null}
        <ThemedText type="emphasis" style={{ color: titleColor, fontSize: 16, lineHeight: 22 }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: subColor }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {accessory}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
