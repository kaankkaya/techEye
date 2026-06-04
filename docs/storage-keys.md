# AsyncStorage Keys

All persisted user settings use `@react-native-async-storage/async-storage`.

| Key | Type | Default | Set by | Read by |
|-----|------|---------|--------|---------|
| `@techeye/selected_voice` | `string \| null` | `undefined` (system default) | `ttsService.saveVoice()` | `ttsService.loadSavedVoice()` |
| `@techeye/speech_rate` | `string` (float) | `0.9` | `ttsService.saveSpeechRate()` | `ttsService.loadSavedSpeechRate()` |
| `@techeye/cooldown_delay` | `string` (int ms) | `4000` | `ttsService.saveCooldown()` | `ttsService.loadSavedCooldown()` |
| `@techeye/distance_unit` | `'metre' \| 'adim'` | `'metre'` | `unitService.saveUnit()` | `unitService.loadSavedUnit()` |
| `@techeye/display_mode` | `'basit' \| 'gelismis'` | `'gelismis'` | `displayService.saveDisplayMode()` | `displayService.loadDisplayMode()` |
| `@techeye/haptic_enabled` | `'true' \| 'false'` | `true` | `proximityHaptics.saveHapticEnabled()` | `proximityHaptics.loadHapticEnabled()` |

## Notes

- All keys use the `@techeye/` namespace prefix.
- Cooldown range: 500–10000 ms (validated on load).
- Speech rate range: 0.5–2.0 (validated on load).
- Haptic enabled stored as string `'true'`/`'false'`; default is `true` if key is absent or any value other than `'false'`.
- Voice ID is stored as raw expo-speech voice identifier string (e.g. `com.apple.ttsbundle.Yelda-compact`).

## In-memory singletons

Each service maintains a module-level variable that is the live in-memory value. Changes from the UI update both the singleton and AsyncStorage simultaneously:

```ts
// ttsService.ts
let activeCooldown = 4000;   // updated by saveCooldown()
let activeVoiceId: string | undefined;
let activeSpeechRate = 0.9;

// unitService.ts
let activeUnit: DistanceUnit = 'metre';

// displayService.ts
let activeMode: DisplayMode = 'gelismis';

// proximityHaptics.ts
let hapticEnabled = true;
```
