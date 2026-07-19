import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Butterfly } from '@/components/butterfly';
import { Fireflies } from '@/components/fireflies';
import { MoonIcon } from '@/components/icons';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { AmbientLayer } from '@/components/ambient-layer';
import { Screen } from '@/components/ui/screen';
import { ScreenKicker } from '@/components/ui/screen-kicker';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme';
import { bloomColorFor } from '@/features/dreams/bloom-color';
import { fetchHarvestedDreams, type HarvestedDream } from '@/features/harvest/api';

/** Deterministic star spots in the grove's dusk sky (percent-based). */
const STAR_SPOTS = [
  { top: '12%', left: '46%', size: 10 },
  { top: '30%', left: '72%', size: 8 },
  { top: '8%', left: '84%', size: 12 },
  { top: '38%', left: '55%', size: 7 },
  { top: '18%', left: '63%', size: 9 },
  { top: '10%', left: '30%', size: 8 },
  { top: '34%', left: '88%', size: 9 },
  { top: '24%', left: '38%', size: 7 },
  { top: '6%', left: '55%', size: 8 },
  { top: '28%', left: '25%', size: 7 },
] as const;

/** Charms hang at varied string lengths so the garland feels hand-tied. */
const CHARM_DROPS = [10, 22, 14, 26, 18];

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** A once-per-visit shooting star across the grove sky. */
function ShootingStar() {
  const reducedMotion = useReducedMotion();
  const flight = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    flight.value = withDelay(1600, withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: flight.value <= 0 || flight.value >= 1 ? 0 : 0.9 - flight.value * 0.5,
    transform: [{ translateX: flight.value * 330 }, { translateY: flight.value * 52 }],
  }));

  if (reducedMotion) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.shootingStar, style]}>
      <Spark size={12} />
      <View style={styles.starTrail} />
    </Animated.View>
  );
}

/** The grove's daytime sun: a warm disc with a soft glow, top-right like the moon. */
function GroveSun() {
  return (
    <View pointerEvents="none" style={styles.groveSun}>
      <View style={styles.sunGlow} />
      <View style={styles.sunDisc} />
    </View>
  );
}

/** Keepsakes live on shelves, two per shelf — like pots in a real glasshouse. */
function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function GreenhouseScreen() {
  const isNight = useResolvedScheme() === 'night';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [charmTrophyId, setCharmTrophyId] = useState<string | null>(null);
  // One small surprise per visit: a shooting star, a butterfly, or extra
  // blossoms on the tree. Cosmetic delight, rolled once on mount.
  const [delightRoll] = useState(() => Math.random());
  const harvestedQuery = useQuery({
    queryKey: ['harvested-dreams'],
    queryFn: fetchHarvestedDreams,
  });
  const harvested = harvestedQuery.data ?? [];
  const trophies = harvested.map((h) => h.trophy);
  const charm = trophies.find((t) => t.id === charmTrophyId);

  const renderKeepsake = ({ trophy, sceneText }: HarvestedDream, index: number) => {
    const date = new Date(trophy.harvested_at).toLocaleDateString();
    const expanded = expandedId === trophy.id;
    return (
      <Pressable
        key={trophy.id}
        accessibilityRole="button"
        accessibilityLabel={`${trophy.dream_title}, came true ${date}, tended ${trophy.total_sessions} times`}
        accessibilityHint="Shows the dream's scene"
        accessibilityState={{ expanded }}
        onPress={() => setExpandedId(expanded ? null : trophy.id)}
        style={styles.keepsake}>
        <View style={styles.keepsakeTop}>
          <PlantGlyph
            state="blooming"
            health="thriving"
            bloomColor={bloomColorFor(trophy.dream_id)}
            size={72}
          />
          <Butterfly size={20} index={index} />
        </View>
        <View style={styles.pot} />
        <View style={styles.plaque}>
          <ThemedText type="smallBold" style={styles.plaqueText} numberOfLines={2}>
            {trophy.dream_title}
          </ThemedText>
          <ThemedText type="small" style={styles.plaqueText}>
            {date} · tended ×{trophy.total_sessions}
          </ThemedText>
        </View>
        {expanded && sceneText ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.scene}>
            {sceneText}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen padded={false}>
      <AmbientLayer />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenKicker
          kicker="Greenhouse · back room"
          title={'The wishing\ngrove'}
          subtitle={
            isNight
              ? 'The charms glow. Something may have appeared.'
              : 'Sun through the glass. The charms are warm.'
          }
        />

        {trophies.length > 0 ? (
          <Pressable
            accessibilityLabel={`The wishing grove: ${trophies.length} dream${trophies.length === 1 ? '' : 's'} came true`}
            onPress={() => setCharmTrophyId(null)}
            style={[styles.grove, isNight ? styles.groveNight : styles.groveDay]}>
            {isNight ? (
              <MoonIcon size={26} holeColor="#2E2438" style={styles.groveMoon} />
            ) : (
              <GroveSun />
            )}
            {isNight
              ? STAR_SPOTS.slice(0, trophies.length).map((spot, i) => (
                  <Spark
                    key={i}
                    size={spot.size}
                    style={[styles.groveStar, { top: spot.top, left: spot.left }]}
                  />
                ))
              : STAR_SPOTS.slice(0, trophies.length).map((spot, i) => (
                  // Daytime pollen motes drifting in the same spots the stars use.
                  <View
                    key={i}
                    style={[
                      styles.pollen,
                      { top: spot.top, left: spot.left, width: spot.size * 0.6, height: spot.size * 0.6 },
                    ]}
                  />
                ))}
            {!isNight ? (
              <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.sunbeam, styles.sunbeamA]} />
                <View style={[styles.sunbeam, styles.sunbeamB]} />
              </View>
            ) : null}
            {isNight && delightRoll < 0.3 ? <ShootingStar /> : null}
            {(isNight ? delightRoll >= 0.3 && delightRoll < 0.55 : delightRoll < 0.55) ? (
              <View style={styles.groveVisitor} pointerEvents="none">
                <Butterfly size={18} color={isNight ? BrandPalette.gold : BrandPalette.dustyPink} />
              </View>
            ) : null}

            <View
              style={styles.tree}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <View style={[styles.canopy, styles.canopyA]} />
              <View style={[styles.canopy, styles.canopyB]} />
              <View style={[styles.canopy, styles.canopyC]} />
              {delightRoll >= 0.55 ? (
                <>
                  <View style={[styles.blossom, { top: 12, left: 20 }]} />
                  <View style={[styles.blossom, { top: 30, left: 52 }]} />
                  <View style={[styles.blossom, { top: 44, left: 10 }]} />
                </>
              ) : null}
              <View style={styles.trunk} />
            </View>

            <View style={styles.garlands} pointerEvents="box-none">
              {chunk(trophies, 5).map((row, rowIndex) => (
                <View key={rowIndex} style={styles.garland} pointerEvents="box-none">
                  {row.map((trophy, i) => (
                    <Pressable
                      key={trophy.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${trophy.dream_title}, came true ${new Date(trophy.harvested_at).toLocaleDateString()}`}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                      onPress={() =>
                        setCharmTrophyId(charmTrophyId === trophy.id ? null : trophy.id)
                      }
                      style={styles.charm}>
                      <View
                        style={[
                          styles.charmString,
                          { height: CHARM_DROPS[i % CHARM_DROPS.length] },
                        ]}
                      />
                      <View
                        style={[
                          styles.charmTag,
                          charmTrophyId === trophy.id && styles.charmTagActive,
                          { transform: [{ rotate: i % 2 === 0 ? '-7deg' : '6deg' }] },
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            {isNight ? (
              // Fireflies are the night shift; sunbeams and pollen are the day's.
              <View
                style={styles.groveFireflies}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants">
                <Fireflies count={Math.min(trophies.length + 2, 7)} areaSize={110} />
              </View>
            ) : null}

            {charm ? (
              <View style={styles.charmCard}>
                <ThemedText type="smallBold" numberOfLines={2} style={styles.charmCardInk}>
                  {charm.dream_title}
                </ThemedText>
                <ThemedText type="small" style={styles.charmCardInk}>
                  Came true {new Date(charm.harvested_at).toLocaleDateString()}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {harvested.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {harvestedQuery.isLoading
                ? 'Opening the greenhouse…'
                : 'Harvest a wish and it blooms here forever.'}
            </ThemedText>
          </View>
        ) : (
          chunkPairs(harvested).map((row, rowIndex) => (
            <View key={row[0].trophy.id} style={styles.shelfGroup}>
              <View style={styles.shelfRow}>
                {row.map((item, i) => renderKeepsake(item, rowIndex * 2 + i))}
                {row.length === 1 ? <View style={styles.keepsakeSpacer} /> : null}
              </View>
              <View style={styles.shelf} />
            </View>
          ))
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.groveFooter}>
          {isNight
            ? 'Charms are little thank-yous. They never expire, and nothing here is for sale.'
            : "Same room, two moods. Fireflies are the night shift; sunbeams and pollen are the day's."}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grove: {
    width: '100%',
    minHeight: 190,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    paddingBottom: Spacing.three,
  },
  groveNight: {
    backgroundColor: '#2E2438',
  },
  groveDay: {
    // Day theme's backgroundElement: sun through the glass, charms warm.
    backgroundColor: '#F3E9DA',
  },
  groveSun: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(233, 180, 76, 0.28)',
  },
  sunDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandPalette.gold,
  },
  sunbeam: {
    position: 'absolute',
    top: -30,
    width: 26,
    height: 150,
    backgroundColor: 'rgba(233, 180, 76, 0.12)',
    transform: [{ rotate: '18deg' }],
  },
  sunbeamA: {
    right: 46,
  },
  sunbeamB: {
    right: 96,
    width: 16,
    backgroundColor: 'rgba(233, 180, 76, 0.09)',
  },
  pollen: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: BrandPalette.gold,
    opacity: 0.4,
  },
  groveMoon: {
    position: 'absolute',
    top: 10,
    right: 12,
    opacity: 0.9,
  },
  groveStar: {
    position: 'absolute',
    opacity: 0.85,
  },
  shootingStar: {
    position: 'absolute',
    top: 18,
    left: -20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTrail: {
    width: 34,
    height: 2,
    borderRadius: 1,
    marginLeft: -4,
    backgroundColor: 'rgba(233, 180, 76, 0.5)',
  },
  groveVisitor: {
    position: 'absolute',
    top: 26,
    right: 52,
  },
  tree: {
    position: 'absolute',
    left: 10,
    bottom: 0,
    width: 96,
    height: 130,
  },
  canopy: {
    position: 'absolute',
    backgroundColor: BrandPalette.deepGreen,
    borderRadius: 999,
  },
  canopyA: {
    width: 74,
    height: 58,
    top: 8,
    left: 8,
  },
  canopyB: {
    width: 54,
    height: 44,
    top: 0,
    left: 34,
    backgroundColor: '#4E8A66',
  },
  canopyC: {
    width: 46,
    height: 38,
    top: 30,
    left: 0,
    backgroundColor: '#356B4D',
  },
  blossom: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BrandPalette.dustyPink,
  },
  trunk: {
    position: 'absolute',
    bottom: 0,
    left: 42,
    width: 10,
    height: 56,
    borderRadius: 4,
    backgroundColor: BrandPalette.warmBrown,
  },
  garlands: {
    paddingTop: Spacing.four,
    paddingLeft: 104,
    paddingRight: Spacing.three,
    gap: Spacing.four,
  },
  garland: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(233, 180, 76, 0.45)',
    paddingHorizontal: Spacing.two,
  },
  charm: {
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  charmString: {
    width: 1.5,
    backgroundColor: 'rgba(233, 180, 76, 0.45)',
  },
  charmTag: {
    width: 16,
    height: 20,
    borderRadius: 4,
    backgroundColor: BrandPalette.gold,
  },
  charmTagActive: {
    borderWidth: 2,
    borderColor: '#FFF3D6',
  },
  groveFireflies: {
    position: 'absolute',
    right: 6,
    bottom: -6,
    width: 110,
    height: 110,
  },
  charmCard: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.three,
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#F6EFE3',
  },
  charmCardInk: {
    color: '#4A4036',
    textAlign: 'center',
  },
  content: {
    padding: Spacing.four,
    paddingTop: 0,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  empty: {
    paddingTop: Spacing.six,
  },
  centered: {
    textAlign: 'center',
  },
  shelfGroup: {
    gap: 0,
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  keepsake: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  keepsakeSpacer: {
    flex: 1,
  },
  keepsakeTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  pot: {
    width: 44,
    height: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: BrandPalette.warmBrown,
    marginTop: -Spacing.two,
  },
  plaque: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#6F6A64',
    borderRadius: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderWidth: 2,
    borderColor: '#57534E',
  },
  plaqueText: {
    color: '#F5F2EC',
    textAlign: 'center',
  },
  scene: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  shelf: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandPalette.warmBrown,
    borderBottomWidth: 2,
    borderBottomColor: '#8A6844',
  },
  groveFooter: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
