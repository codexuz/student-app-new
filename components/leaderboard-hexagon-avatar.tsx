import { Image, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

// Flat-top hexagon points for a `size`x`size` box, inset by `strokeWidth/2`
// so the border doesn't get clipped at the edges.
function hexagonPoints(size: number, inset: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  });
  return points.join(' ');
}

interface LeaderboardHexagonAvatarProps {
  size: number;
  avatarUrl?: string;
  fallbackLetter: string;
  borderColor: string;
  rank: number;
  rankColor: string;
}

export function LeaderboardHexagonAvatar({
  size,
  avatarUrl,
  fallbackLetter,
  borderColor,
  rank,
  rankColor,
}: LeaderboardHexagonAvatarProps) {
  const strokeWidth = 3;
  const points = hexagonPoints(size, strokeWidth);
  const badgeSize = size * 0.34;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Polygon points={points} fill={borderColor} />
      </Svg>

      <View style={[styles.imageWrap, { width: size - strokeWidth * 4, height: size - strokeWidth * 4 }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.image} />
        ) : (
          <View style={[styles.fallback, { backgroundColor: borderColor }]}>
            <Text style={[styles.fallbackText, { fontSize: size * 0.32 }]}>{fallbackLetter}</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.rankBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: rankColor,
          },
        ]}
      >
        <Text style={[styles.rankText, { fontSize: badgeSize * 0.55 }]}>{rank}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '700',
    color: '#fff',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rankText: {
    fontWeight: '800',
    color: '#fff',
  },
});
