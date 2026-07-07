import { Modal, Pressable, StyleSheet, View, type ModalProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: ModalProps['animationType'];
};

export function Sheet({ visible, onClose, children, animationType = 'slide' }: SheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <ThemedView type="background" style={[styles.sheet, { borderColor: theme.border }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {children}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.two,
  },
});
