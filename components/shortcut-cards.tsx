import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SPACING } from '@/theme/globals';

const TILE_WIDTH = 152;
const TILE_HEIGHT = 132;

interface Shortcut {
  key: string;
  title: string;
  /** A `require()`'d local image resource. */
  image: number;
  glowColor: string;
  gradient: { light: [string, string]; dark: [string, string] };
  onPress: () => void;
}

type ShortcutCardProps = Omit<Shortcut, 'key'>;

function ShortcutCard({ title, image, glowColor, gradient, onPress }: ShortcutCardProps) {
  const scheme = useColorScheme();

  return (
    <View style={[styles.glowWrap, { shadowColor: glowColor }]}>
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={gradient[scheme]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.arrowBadge}>
              <Icon name={ArrowUpRight} size={14} color='#FFFFFF' strokeWidth={2.5} />
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <Image source={image} style={styles.icon} contentFit='contain' />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

interface ShortcutCardsProps {
  shortcuts: Shortcut[];
}

export function ShortcutCards({ shortcuts }: ShortcutCardsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {shortcuts.map((shortcut) => (
        <ShortcutCard
          key={shortcut.key}
          title={shortcut.title}
          image={shortcut.image}
          glowColor={shortcut.glowColor}
          gradient={shortcut.gradient}
          onPress={shortcut.onPress}
        />
      ))}
    </ScrollView>
  );
}

export function buildDefaultShortcuts(opts: {
  onExamsPress: () => void;
  onBooksPress: () => void;
  onMoviesPress: () => void;
}): Shortcut[] {
  return [
    {
      key: 'exams',
      title: 'Exams',
      image: require('@/assets/images/icons/exam_glass.png'),
      glowColor: '#22c55e',
      gradient: { light: ['#4ADE80', '#16A34A'], dark: ['#0F3B22', '#08170D'] },
      onPress: opts.onExamsPress,
    },
    {
      key: 'books',
      title: 'Books',
      image: require('@/assets/images/icons/book_glass.png'),
      glowColor: '#3b82f6',
      gradient: { light: ['#5B93FF', '#215AE0'], dark: ['#1E3A78', '#0A1226'] },
      onPress: opts.onBooksPress,
    },
    {
      key: 'movies',
      title: 'Movies',
      image: require('@/assets/images/icons/movie_glass.png'),
      glowColor: '#ef4444',
      gradient: { light: ['#FF7676', '#DC2626'], dark: ['#5C1620', '#1C0A0C'] },
      onPress: opts.onMoviesPress,
    },
  ];
}

const styles = StyleSheet.create({
  scroll: {
    height: TILE_HEIGHT,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  glowWrap: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 20,
    padding: SPACING.sm,
    overflow: 'hidden',
  },
  headerRow: {
    gap: 6,
  },
  arrowBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  icon: {
    position: 'absolute',
    bottom: -22,
    right: -22,
    width: 116,
    height: 116,
    transform: [{ rotate: '-6deg' }],
  },
});
