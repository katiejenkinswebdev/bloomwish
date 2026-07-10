import { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Branding } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const INTRO_PAGES = [
  {
    key: 'plant',
    title: 'Plant a wish',
    body: `Every dream starts as a seed. In ${Branding.appName}, you'll capture what you long for and plant it in a garden that's yours alone.`,
  },
  {
    key: 'tend',
    title: 'Tend it daily',
    body: 'A few quiet minutes of visualization waters your dream. Watch it sprout, bud, and bloom as you show up for it.',
  },
  {
    key: 'harvest',
    title: 'Harvest it in real life',
    body: 'When a dream comes true out there in the world, you harvest it here — and it stays in your garden forever.',
  },
] as const;

export default function OnboardingIntroScreen() {
  const theme = useTheme();
  const listRef = useRef<FlatList>(null);
  // Measured at layout so browser resizes and split screens stay correct.
  const [pageWidth, setPageWidth] = useState(() => Dimensions.get('window').width);
  const [pageIndex, setPageIndex] = useState(0);
  const isLastPage = pageIndex === INTRO_PAGES.length - 1;

  // The button drives the index directly — scroll events (which never fire
  // as "momentum" on web) only keep the dots in sync during manual swipes.
  const goToPage = (index: number) => {
    setPageIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleNext = () => {
    if (isLastPage) {
      router.push('/onboarding/taste');
    } else {
      goToPage(pageIndex + 1);
    }
  };

  return (
    <Screen padded={false}>
      <View
        style={styles.pagerArea}
        onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
        <FlatList
          ref={listRef}
          data={INTRO_PAGES}
          keyExtractor={(page) => page.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: pageWidth,
            offset: pageWidth * index,
            index,
          })}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
            if (index >= 0 && index < INTRO_PAGES.length) setPageIndex(index);
          }}
          scrollEventThrottle={64}
          renderItem={({ item }) => (
            <View style={[styles.page, { width: pageWidth }]}>
              <Spark size={36} />
              <ThemedText type="title" style={styles.centered}>
                {item.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                {item.body}
              </ThemedText>
            </View>
          )}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {INTRO_PAGES.map((page, index) => (
            <View
              key={page.key}
              style={[
                styles.dot,
                {
                  backgroundColor: index === pageIndex ? BrandPalette.gold : theme.border,
                },
              ]}
            />
          ))}
        </View>
        <Button label={isLastPage ? 'Let’s begin' : 'Next'} onPress={handleNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pagerArea: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.six,
  },
  centered: {
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
