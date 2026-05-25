export const colors = {
  // Backgrounds
  background: '#0F0A08',
  surface:    '#1A1108',

  // Accents
  accent:      '#F97316',
  accentPress: '#EA580C',
  accentSoft:  'rgba(249, 115, 22, 0.13)',

  // States
  danger: '#DC2626',

  // Structural
  border:  '#2A211A',
  overlay: 'rgba(15, 10, 8, 0.75)',

  // Text
  text:          '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
} as const;

export type Colors = typeof colors;
