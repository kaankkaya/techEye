import { Text, TextProps, StyleSheet } from 'react-native';

type Weight = 'regular' | 'bold';

type Props = TextProps & {
  size?: number;
  weight?: Weight;
};

const FONT: Record<Weight, string> = {
  regular: 'Inter_400Regular',
  bold:    'Inter_700Bold',
};

export default function AppText({ size, weight = 'regular', style, ...props }: Props) {
  return (
    <Text
      style={[
        style,
        {
          fontFamily: FONT[weight],
          includeFontPadding: false,
          ...(size !== undefined ? { fontSize: size } : {}),
        },
      ]}
      {...props}
    />
  );
}
