import AsyncStorage from '@react-native-async-storage/async-storage';

export type DistanceUnit = 'metre' | 'adim';

const UNIT_KEY = '@eyetech/distance_unit';
const STEP_CM = 75; // ortalama adım uzunluğu

let activeUnit: DistanceUnit = 'metre';

export async function initUnit(): Promise<void> {
  const saved = await AsyncStorage.getItem(UNIT_KEY);
  if (saved === 'metre' || saved === 'adim') activeUnit = saved;
}

export async function saveUnit(unit: DistanceUnit): Promise<void> {
  activeUnit = unit;
  await AsyncStorage.setItem(UNIT_KEY, unit);
}

export async function loadSavedUnit(): Promise<DistanceUnit> {
  const saved = await AsyncStorage.getItem(UNIT_KEY);
  return saved === 'metre' || saved === 'adim' ? saved : 'metre';
}

export function getActiveUnit(): DistanceUnit {
  return activeUnit;
}

export const UNIT_LABELS: Record<DistanceUnit, string> = {
  metre: 'Metre',
  adim:  'Adım',
};

export function formatDistance(meters: number): string | null {
  if (meters <= 0) return null;

  if (activeUnit === 'adim') {
    const steps = Math.round((meters * 100) / STEP_CM);
    return steps <= 0 ? null : `${steps} adım`;
  }

  return `${meters.toFixed(1)} metre`;
}
