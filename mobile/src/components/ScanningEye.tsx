import { useRef, useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

type Props = { isScanning: boolean; size?: number; style?: ViewStyle };

export default function ScanningEye({ isScanning, size = 56, style }: Props) {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isScanning) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [isScanning]);

  return (
    <View style={style}>
      <LottieView
        ref={lottieRef}
        source={require('../../assets/animations/eye/scanning-eye.json')}
        autoPlay={false}
        loop
        style={{ width: size, height: size }}
      />
    </View>
  );
}
