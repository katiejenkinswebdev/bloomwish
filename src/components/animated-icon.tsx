import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BrandPalette } from '@/constants/brand-palette';

const DURATION = 600;

/**
 * Bridges the native splash (cream, centered Wishing Seed) into the app with
 * a soft fade once the first screen has rendered.
 */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { opacity: 1 },
    100: { opacity: 0, easing: Easing.out(Easing.quad) },
  });

  const image = (
    <Image style={styles.image} source={require('@/assets/images/splash-icon.png')} />
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 160,
    height: 160,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BrandPalette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
