# TTS & Haptics

## TTS (`ttsService.ts`)

### Cooldown mechanism
Every call to `speak(text, objectClass?)` is gated by a per-key cooldown:
```ts
const key = objectClass ?? text;
if (lastSpokenAt[key] && now - lastSpokenAt[key] < activeCooldown) return;
```
- If `objectClass` is passed, it is the cooldown key (e.g. `'person'`).
- For grouped announcements, the key is the joined label string: `'person_bicycle'`.
- Default cooldown: **4000 ms** (configurable 500–10000 ms via Settings slider).

### Speech options
```ts
Speech.speak(text, {
  language: 'tr-TR',
  rate: activeSpeechRate,   // default 0.9
  pitch: 1.0,
  voice: activeVoiceId,     // undefined = system default
});
```

### Announcement format (`announcementUtils.ts`)

Single object:
```
"1.3 metrede kişi"        (metre mode)
"2 adımınızda köpek"      (adım mode)
"Yakınınızda araba"        (no depth available)
"Önünüzde kişi"            (no depth, person-specific prefix)
```

Grouped objects (within 0.5 m of the closest):
```
"1.3 metrede kişi ve bisiklet"
"Yakınınızda araba ve kamyon"
```

### Turkish label map
| English | Turkish | No-dist prefix |
|---------|---------|---------------|
| person | kişi | Önünüzde |
| car | araba | Yakınınızda |
| dog | köpek | Yakınınızda |
| bicycle | bisiklet | Yakınınızda |
| truck | kamyon | Yakınınızda |
| bus | otobüs | Yakınınızda |
| cat | kedi | Yakınınızda |

### Priority order (for `prioritizeDetections()`)
```
person → car → dog → bicycle → truck → bus → cat
```
Within same priority: closer object announced first.

### `isCloseEnough()` filter
Objects must pass this before being announced:
- If `distanceMeters > 0`: must be ≤ 5 m.
- If no depth: falls back to bounding box area ≥ 15% of frame (`width × height ≥ 0.15`).

### Group distance threshold
Objects within **0.5 m** of the top-priority object are grouped into a single announcement.

---

## Haptics (`proximityHaptics.ts`)

### Trigger rules
Haptics fire independently of TTS. Cooldown per level: **3000 ms**.

| Level | Condition | Pattern |
|-------|-----------|---------|
| `danger` | person or car: bbox height ≥ 70% OR distanceMeters ≤ 1.5 m | 3× Heavy pulses (130 ms apart) |
| `warning` | car only: bbox height 35–70% OR distanceMeters 1.5–3 m | 2× Medium pulses |

- `danger` takes priority; if danger fires, `warning` is skipped.
- Haptic enabled state defaults to `true`; persisted at `@techeye/haptic_enabled`.

### Why bbox height instead of distance
At 320×320 input resolution, FastDepth bottoms out at ~1.0–1.2 m for persons and cars. Distance < 1 m is never reliably measured. Bbox height is a more reliable close-range proxy at this resolution.
