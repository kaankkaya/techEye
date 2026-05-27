import { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../theme/ThemeContext';

const ANIMATION_CONTENT_MS = 1100; // frame 66 / 60fps

type Props = { onDone: () => void };

export default function LoadingScreen({ onDone }: Props) {
  const theme = useTheme();
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => onDone());
    }, ANIMATION_CONTENT_MS);

    return () => clearTimeout(timer);
  }, [scale, opacity, onDone]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <LottieView
          source={require('../../assets/animations/eye/loading-eye.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lottie:    { width: 120, height: 120 },
});
