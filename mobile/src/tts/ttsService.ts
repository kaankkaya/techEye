import * as Speech from 'expo-speech';

const COOLDOWN_MS = 4000;
const lastSpokenAt: Record<string, number> = {};

export async function speak(text: string, objectClass?: string): Promise<void> {
  const key = objectClass ?? text;
  const now = Date.now();

  if (lastSpokenAt[key] && now - lastSpokenAt[key] < COOLDOWN_MS) {
    return;
  }

  lastSpokenAt[key] = now;

  Speech.speak(text, {
    language: 'tr-TR',
    rate: 0.9,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
