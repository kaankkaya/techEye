import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COOLDOWN_MS = 4000;
const STORAGE_KEY = '@eyetech/selected_voice';
const lastSpokenAt: Record<string, number> = {};

let activeVoiceId: string | undefined;

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
  await loadSavedVoice();
}

export async function speak(text: string, objectClass?: string): Promise<void> {
  const key = objectClass ?? text;
  const now = Date.now();

  if (lastSpokenAt[key] && now - lastSpokenAt[key] < COOLDOWN_MS) return;
  lastSpokenAt[key] = now;

  Speech.speak(text, {
    language: 'tr-TR',
    rate: 0.9,
    pitch: 1.0,
    ...(activeVoiceId ? { voice: activeVoiceId } : {}),
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
