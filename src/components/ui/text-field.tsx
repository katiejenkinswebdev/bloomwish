import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  errorText?: string;
};

export function TextField({ label, errorText, style, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          style={[
            styles.input,
            isPasswordField && styles.inputWithToggle,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: errorText ? theme.danger : isFocused ? theme.primary : theme.border,
            },
            style,
          ]}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {isPasswordField ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setIsPasswordVisible((v) => !v)}
            hitSlop={8}
            style={styles.toggle}>
            <ThemedText type="smallBold" themeColor="primary">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      {errorText ? (
        <ThemedText type="small" themeColor="danger">
          {errorText}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 64,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
