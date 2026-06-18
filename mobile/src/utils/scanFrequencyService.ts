import AsyncStorage from '@react-native-async-storage/async-storage';

const SCAN_FREQ_KEY = '@eyetech/scan_frequency';

export type ScanFrequency = 1 | 2 | 5;

export const SCAN_FREQ_OPTIONS: ScanFrequency[] = [1, 2, 5];

export const SCAN_FREQ_LABELS: Record<ScanFrequency, string> = {
  1: 'Yavaş (1/sn)',
  2: 'Normal (2/sn)',
  5: 'Hızlı (5/sn)',
};

export function freqToIntervalMs(freq: ScanFrequency): number {
  return Math.round(1000 / freq);
}

let currentIntervalMs = 500;

export function getScanIntervalMs(): number {
  return currentIntervalMs;
}

export async function initScanFrequency(): Promise<void> {
  const freq = await loadScanFrequency();
  currentIntervalMs = freqToIntervalMs(freq);
}

export async function saveScanFrequency(freq: ScanFrequency): Promise<void> {
  currentIntervalMs = freqToIntervalMs(freq);
  await AsyncStorage.setItem(SCAN_FREQ_KEY, String(freq));
}

export async function loadScanFrequency(): Promise<ScanFrequency> {
  const saved = await AsyncStorage.getItem(SCAN_FREQ_KEY);
  if (saved === '1' || saved === '5') return Number(saved) as ScanFrequency;
  return 2;
}
