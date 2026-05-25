import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = TouchableOpacityProps & {
  haptic?: 'light' | 'medium' | 'heavy' | 'selection';
};

export default function HapticButton({ onPress, haptic = 'medium', ...props }: Props) {
  const handlePress: TouchableOpacityProps['onPress'] = (e) => {
    if (haptic === 'selection') {
      Haptics.selectionAsync();
    } else {
      const style = {
        light:  Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy:  Haptics.ImpactFeedbackStyle.Heavy,
      }[haptic];
      Haptics.impactAsync(style);
    }
    onPress?.(e);
  };

  return <TouchableOpacity {...props} onPress={handlePress} />;
}
