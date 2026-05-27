import { View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

type Props = { isScanning: boolean; style?: ViewStyle };

export default function ScanningEye({ isScanning, style }: Props) {
  return (
    <View style={style}>
      <LottieView
        source={require('../../assets/animations/eye/scanning-eye.json')}
        autoPlay={isScanning}
        loop={isScanning}
        style={{ width: 56, height: 56 }}
      />
    </View>
  );
}
