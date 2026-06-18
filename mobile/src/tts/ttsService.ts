import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COOLDOWN_MS = 4000;
const STORAGE_KEY = '@eyetech/selected_voice';
const RATE_KEY = '@eyetech/tts_rate';
const lastSpokenAt: Record<string, number> = {};

let activeVoiceId: string | undefined;
let activeRate = 0.9;
let speaking = false;

export async function loadSavedRate(): Promise<number> {
  try {
    const saved = await AsyncStorage.getItem(RATE_KEY);
    if (saved !== null) activeRate = parseFloat(saved);
  } catch {}
  return activeRate;
}

export async function saveRate(rate: number): Promise<void> {
  activeRate = rate;
  try {
    await AsyncStorage.setItem(RATE_KEY, String(rate));
  } catch {}
}

export async function loadSavedVoice(): Promise<string | undefined> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    activeVoiceId = saved ?? undefined;
  } catch {}
  return activeVoiceId;
}

export async function saveVoice(identifier: string | undefined): Promise<void> {
  activeVoiceId = identifier;
  try {
    if (identifier) {
      await AsyncStorage.setItem(STORAGE_KEY, identifier);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export async function getTurkishVoices(): Promise<Speech.Voice[]> {
  const all = await Speech.getAvailableVoicesAsync();
  return all.filter(v => v.language.startsWith('tr'));
}

export async function initTTS(): Promise<void> {
  await Promise.all([loadSavedVoice(), loadSavedRate()]);
}

export function isSpeakingNow(): boolean {
  return speaking;
}

const SPEECH_OPTIONS = () => ({
  language: 'tr-TR',
  rate: activeRate,
  pitch: 1.0,
  ...(activeVoiceId ? { voice: activeVoiceId } : {}),
});

export async function speak(text: string, objectClass?: string): Promise<void> {
  const key = objectClass ?? text;
  const now = Date.now();

  if (lastSpokenAt[key] && now - lastSpokenAt[key] < COOLDOWN_MS) return;
  lastSpokenAt[key] = now;

  speaking = true;
  Speech.speak(text, {
    ...SPEECH_OPTIONS(),
    onDone:    () => { speaking = false; },
    onStopped: () => { speaking = false; },
    onError:   () => { speaking = false; },
  });
}

// Mevcut sesi keser ve cooldown'u yok sayarak anında konuşur
export function speakUrgent(text: string, objectClass?: string): void {
  const key = objectClass ?? text;
  Speech.stop();
  lastSpokenAt[key] = Date.now();
  speaking = true;
  Speech.speak(text, {
    ...SPEECH_OPTIONS(),
    onDone:    () => { speaking = false; },
    onStopped: () => { speaking = false; },
    onError:   () => { speaking = false; },
  });
}

export function stopSpeaking(): void {
  Speech.stop();
  speaking = false;
}
