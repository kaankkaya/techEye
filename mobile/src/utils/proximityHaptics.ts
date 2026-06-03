import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectedObject } from './announcementUtils';

const HAPTIC_ENABLED_KEY = '@eyetech/haptic_enabled';
const COOLDOWN_MS = 3000;

type HapticLevel = 'danger' | 'warning';

let hapticEnabled = true;
const lastFired: Record<HapticLevel, number> = { danger: 0, warning: 0 };

// ─── Persistence ─────────────────────────────────────────────────────────────

export async function initHaptics(): Promise<void> {
  const saved = await AsyncStorage.getItem(HAPTIC_ENABLED_KEY);
  hapticEnabled = saved !== 'false';
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

// ─── Yakınlık sinyali ────────────────────────────────────────────────────────
//
//  distanceMeters yerine bbox yüksekliği birincil sinyal olarak kullanılır.
//  Sebep: 320px kare girişte nesne frame'i doldurduğunda kamera modeli
//  minimuma kilitlenir (kişi ~1.22m, araba ~1.07m). Dolayısıyla "< 1m"
//  hiçbir zaman gözlemlenmez. Bbox oranı bu durumda daha güvenilirdir.
//
//  Kural 1 (danger)  — kişi/araba bbox yüksekliği ≥ %70  →  3 × Heavy
//    Fiziksel karşılık: kişi < ~1.7m, araba < ~1.1m kameradan uzakta
//
//  Kural 2 (warning) — araba bbox yüksekliği %35–%70      →  2 × Medium
//    Fiziksel karşılık: araba ~1.5–3m arası
//
//  Danger, warning'e göre önceliklidir.
//  Her kural için 3 saniyelik bağımsız cooldown uygulanır.

function isDangerClose(o: DetectedObject): boolean {
  if (o.label !== 'person' && o.label !== 'car') return false;
  const bboxH = o.boundingBox?.height ?? 0;
  if (bboxH >= 0.7) return true;
  // distanceMeters fallback (güvenilir olduğunda)
  return (o.distanceMeters ?? -1) > 0 && (o.distanceMeters as number) <= 1.5;
}

function isWarningClose(o: DetectedObject): boolean {
  if (o.label !== 'car') return false;
  const bboxH = o.boundingBox?.height ?? 0;
  if (bboxH >= 0.35 && bboxH < 0.7) return true;
  const d = o.distanceMeters ?? -1;
  return d > 1.5 && d <= 3;
}

// ─── Kural motoru ─────────────────────────────────────────────────────────────

export function evaluateProximityHaptics(objects: DetectedObject[]): void {
  if (!hapticEnabled) return;

  const now = Date.now();

  if (objects.some(isDangerClose)) {
    if (now - lastFired.danger > COOLDOWN_MS) {
      lastFired.danger = now;
      fireSequential(3, Haptics.ImpactFeedbackStyle.Heavy);
    }
    return;
  }

  if (objects.some(isWarningClose)) {
    if (now - lastFired.warning > COOLDOWN_MS) {
      lastFired.warning = now;
      fireSequential(2, Haptics.ImpactFeedbackStyle.Medium);
    }
  }
}
