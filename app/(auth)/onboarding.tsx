import { useRef, useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { markOnboardingSeen } from '@/lib/onboarding';
import { SPACING } from '@/theme/globals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Welcome to Student App!',
    description: 'Your smart companion for your English journey.',
    image: require('@/assets/images/onboarding/intro_1.png'),
  },
  {
    title: 'Interactive Lessons',
    description:
      'Learn with real English environment, instant feedback, and gamified quizzes.',
    image: require('@/assets/images/onboarding/intro_2.png'),
  },
  {
    title: 'Track Your Progress',
    description: 'Monitor your improvement and unlock rewards as you learn.',
    image: require('@/assets/images/onboarding/intro_3.png'),
  },
];

function PaginationDot({
  index,
  length,
  progress,
}: {
  index: number;
  length: number;
  progress: SharedValue<number>;
}) {
  const border = useColor('border');
  const primary = useColor('primary');
  const width = 8;

  const style = useAnimatedStyle(() => {
    let inputRange = [index - 1, index, index + 1];
    let outputRange = [-width, 0, width];

    if (index === 0 && progress.value > length - 1) {
      inputRange = [length - 1, length, length + 1];
      outputRange = [-width, 0, width];
    }

    return {
      transform: [
        { translateX: interpolate(progress.value, inputRange, outputRange, Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[styles.dotTrack, { backgroundColor: border, width }]}>
      <Animated.View style={[styles.dotFill, { backgroundColor: primary }, style]} />
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useSharedValue(0);
  const carouselRef = useRef<ICarouselInstance>(null);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const finishOnboarding = async () => {
    await markOnboardingSeen();
    router.replace('/sign-in');
  };

  const handlePrimaryPress = () => {
    if (isLastSlide) {
      finishOnboarding();
    } else {
      carouselRef.current?.next();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text variant='title' style={styles.brandTitle}>
          Impulse Study
        </Text>
        <Text variant='caption'>Learning Center</Text>
      </View>

      <View style={styles.carouselContainer}>
        <Carousel
          ref={carouselRef}
          loop={false}
          width={SCREEN_WIDTH}
          height={480}
          data={SLIDES}
          scrollAnimationDuration={300}
          onProgressChange={(_, absoluteProgress) => {
            progress.value = absoluteProgress;
          }}
          onSnapToItem={setActiveIndex}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={item.image} style={styles.image} contentFit='contain' />
              <Text variant='title' style={styles.slideTitle}>
                {item.title}
              </Text>
              <Text variant='caption' style={styles.slideDescription}>
                {item.description}
              </Text>
            </View>
          )}
        />
      </View>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, index) => (
          <PaginationDot key={index} index={index} length={SLIDES.length} progress={progress} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button size='lg' style={styles.primaryButton} onPress={handlePrimaryPress}>
          {isLastSlide ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  brandTitle: {
    marginBottom: 2,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  image: {
    width: SCREEN_WIDTH * 0.6,
    height: 250,
    marginBottom: SPACING.xl,
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  slideDescription: {
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dotTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dotFill: {
    flex: 1,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  primaryButton: {
    width: '100%',
  },
});
