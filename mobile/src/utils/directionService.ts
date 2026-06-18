import AsyncStorage from '@react-native-async-storage/async-storage';

const DIRECTION_KEY = '@eyetech/direction_enabled';
let directionEnabled = true;

export async function initDirection(): Promise<void> {
  const saved = await AsyncStorage.getItem(DIRECTION_KEY);
  if (saved !== null) directionEnabled = saved === 'true';
}

export async function saveDirectionEnabled(value: boolean): Promise<void> {
  directionEnabled = value;
  await AsyncStorage.setItem(DIRECTION_KEY, String(value));
}

export async function loadDirectionEnabled(): Promise<boolean> {
  const saved = await AsyncStorage.getItem(DIRECTION_KEY);
  return saved === null ? true : saved === 'true';
}

export function isDirectionEnabled(): boolean {
  return directionEnabled;
}

export type Direction = 'solunuz' | 'önünüz' | 'sağınız';

export function getObjectDirection(boundingBox: {
  left: number;
  top: number;
  width: number;
  height: number;
}): Direction {
  const centerX = boundingBox.left + boundingBox.width / 2;
  if (centerX < 1 / 3) return 'solunuz';
  if (centerX > 2 / 3) return 'sağınız';
  return 'önünüz';
}
