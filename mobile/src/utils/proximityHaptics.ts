import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectedObject } from './announcementUtils';

const HAPTIC_ENABLED_KEY = '@techeye/haptic_enabled';
const COOLDOWN_MS = 3000;

type HapticLevel = 'danger' | 'warning';

let hapticEnabled = true;
const lastFired: Record<HapticLevel, number> = { danger: 0, warning: 0 };

// ─── Persistence ─────────────────────────────────────────────────────────────

export async function initHaptics(): Promise<void> {
  const saved = await AsyncStorage.getItem(HAPTIC_ENABLED_KEY);
  hapticEnabled = saved !== 'false'; // varsayılan: açık
}

export async function saveHapticEnabled(enabled: boolean): Promise<void> {
  hapticEnabled = enabled;
  await AsyncStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
}

export async function loadHapticEnabled(): Promise<boolean> {
  const saved = await AsyncStorage.getItem(HAPTIC_ENABLED_KEY);
  return saved !== 'false';
}

export function getHapticEnabled(): boolean {
  return hapticEnabled;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fireSequential(
  count: number,
  style: Haptics.ImpactFeedbackStyle,
): Promise<void> {
  for (let i = 0; i < count; i++) {
    Haptics.impactAsync(style);
    if (i < count - 1) await wait(130);
  }
}

// ─── Kural motoru ─────────────────────────────────────────────────────────────
//
//  Kural 1 (danger)  — kişi VEYA araba < 1 m  →  3 × Heavy   [cooldown 3s]
//  Kural 2 (warning) — araba 1–2 m arası       →  2 × Medium  [cooldown 3s]
//
//  Danger, warning'e göre önceliklidir; aynı döngüde ikisi birden tetiklenmez.

export function evaluateProximityHaptics(objects: DetectedObject[]): void {
  if (!hapticEnabled) return;

  const now = Date.now();

  const hasDanger = objects.some(
    o =>
      (o.label === 'person' || o.label === 'car') &&
      o.distanceMeters != null &&
      o.distanceMeters > 0 &&
      o.distanceMeters < 1,
  );

  if (hasDanger) {
    if (now - lastFired.danger > COOLDOWN_MS) {
      lastFired.danger = now;
      fireSequential(3, Haptics.ImpactFeedbackStyle.Heavy);
    }
    return;
  }

  const hasWarning = objects.some(
    o =>
      o.label === 'car' &&
      o.distanceMeters != null &&
      o.distanceMeters >= 1 &&
      o.distanceMeters <= 2,
  );

  if (hasWarning && now - lastFired.warning > COOLDOWN_MS) {
    lastFired.warning = now;
    fireSequential(2, Haptics.ImpactFeedbackStyle.Medium);
  }
}
