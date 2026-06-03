import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisplayMode = 'basit' | 'gelismis';

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  basit:    'Basit',
  gelismis: 'Gelişmiş',
};

export const DISPLAY_MODE_OPTIONS: DisplayMode[] = ['basit', 'gelismis'];

const DISPLAY_MODE_KEY = '@eyetech/display_mode';
let activeMode: DisplayMode = 'gelismis';

export async function initDisplayMode(): Promise<void> {
  const saved = await AsyncStorage.getItem(DISPLAY_MODE_KEY);
  if (saved === 'basit' || saved === 'gelismis') activeMode = saved;
}

export async function saveDisplayMode(mode: DisplayMode): Promise<void> {
  activeMode = mode;
  await AsyncStorage.setItem(DISPLAY_MODE_KEY, mode);
}

export async function loadDisplayMode(): Promise<DisplayMode> {
  const saved = await AsyncStorage.getItem(DISPLAY_MODE_KEY);
  return saved === 'basit' ? 'basit' : 'gelismis';
}

export function getDisplayMode(): DisplayMode {
  return activeMode;
}
