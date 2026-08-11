import { useRef } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel';
import { useSharedValue } from 'react-native-reanimated';
import { ArrowUpRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

const CARD_HEIGHT = 168;

interface SocialLink {
  key: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  glowColor: string;
  url: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    key: 'youtube',
    title: 'Watch on YouTube',
    subtitle: 'Free video lessons & tutorials',
    cta: 'Watch Now',
    icon: 'logo-youtube',
    colors: ['#FF3B3B', '#8A0000'],
    glowColor: '#FF0000',
    url: 'https://youtube.com/@impulse_lc',
  },
  {
    key: 'telegram',
    title: 'Join Telegram',
    subtitle: 'Daily tips & community discussion',
    cta: 'Join Chat',
    icon: 'paper-plane',
    colors: ['#37AEE2', '#0A5C8A'],
    glowColor: '#0088cc',
    url: 'https://t.me/impulse_lc',
  },
  {
    key: 'instagram',
    title: 'Follow on Instagram',
    subtitle: 'Behind the scenes & updates',
    cta: 'Follow Us',
    icon: 'logo-instagram',
    colors: ['#f9924b', '#dc2743', '#9c1888'],
    glowColor: '#dc2743',
    url: 'https://instagram.com/impulsestudy_lc',
  },
];

export function SocialCards() {
  const { width } = useWindowDimensions();
  const carouselWidth = width - SPACING.md * 2;
  const carouselRef = useRef<ICarouselInstance>(null);
  const progress = useSharedValue(0);
  const border = useColor('border');
  const primary = useColor('primary');

  return (
    <View style={styles.container}>
      <Carousel
        ref={carouselRef}
        loop
        autoPlay
        autoPlayInterval={3800}
        scrollAnimationDuration={800}
        width={carouselWidth}
        height={CARD_HEIGHT}
        data={SOCIAL_LINKS}
        onProgressChange={progress}
        renderItem={({ item }) => (
          <View style={[styles.glowWrap, { shadowColor: item.glowColor }]}>
            <Pressable onPress={() => Linking.openURL(item.url)} style={styles.pressable}>
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Decorative bokeh */}
                <View style={styles.bokehLarge} />
                <View style={styles.bokehSmall} />

                {/* Oversized ghost watermark of the platform icon */}
                <Ionicons
                  name={item.icon}
                  size={148}
                  color='rgba(255, 255, 255, 0.14)'
                  style={styles.watermark}
                />

                <View style={styles.iconBadge}>
                  <Ionicons name={item.icon} size={24} color='#FFFFFF' />
                </View>

                <View style={styles.content}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>

                <View style={styles.ctaButton}>
                  <Text style={[styles.ctaText, { color: item.colors[0] }]}>{item.cta}</Text>
                  <Icon name={ArrowUpRight} size={15} color={item.colors[0]} strokeWidth={2.75} />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      />

      <Pagination.Basic
        progress={progress}
        data={SOCIAL_LINKS}
        size={6}
        containerStyle={styles.dots}
        dotStyle={{ backgroundColor: border, borderRadius: 3 }}
        activeDotStyle={{ backgroundColor: primary, borderRadius: 3, width: 18 }}
        onPress={(index) => carouselRef.current?.scrollTo({ index, animated: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  glowWrap: {
    height: CARD_HEIGHT,
    borderRadius: 26,
    elevation: 0,
  },
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    borderRadius: 26,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  bokehLarge: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  bokehSmall: {
    position: 'absolute',
    bottom: 20,
    left: 90,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  watermark: {
    position: 'absolute',
    right: -28,
    bottom: -28,
    transform: [{ rotate: '-12deg' }],
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    gap: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.88)',
    maxWidth: '80%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dots: {
    gap: 6,
    alignSelf: 'center',
  },
});
