# eyeTech — CLAUDE.md

> **Agent prensipleri ve metodları için → [`AGENTS.md`](./AGENTS.md)**
> Bu projede çalışan her agent'ın nasıl davranması gerektiğini, hangi metodları kullandığını ve kısıtlamalarını `AGENTS.md` tanımlar. Kod yazarken veya mimari karar alırken o dosyayı referans al.

> **Uygulama tasarımı ve iş mantığı için → [`PROD_SPEC.md`](./PROD_SPEC.md)**
> Ekranlar, bileşen davranışları, renk sistemi, detection logic, API entegrasyonu ve TTS davranışı `PROD_SPEC.md` içinde tanımlıdır. React Native kodu yazılırken bu dosya birincil referanstır — `PROD_SPEC.md`'de tanımlı olmayan hiçbir tasarım kararı veya iş mantığı eklenmez.

## Project Overview

**eyeTech** is a social responsibility project designed to assist visually impaired individuals. The app uses the device's camera combined with AI-powered object detection to identify nearby objects and people, then announces them aloud via text-to-speech in natural, contextual English sentences (e.g., *"There is a person in front of you"*, *"A car is approaching on your right"*).

## Goals

- Provide real-time environmental awareness for visually impaired users
- Keep interactions simple, audio-first, and non-intrusive
- Be accessible by design at every layer of the stack

## Tech Stack

- **Mobile App**: React Native (cross-platform, iOS + Android)
- **Object Detection**: Cloud-based AI vision API — a captured frame is sent to a fast external API (e.g., Google Cloud Vision, AWS Rekognition, or OpenAI Vision); the response is processed on-device
- **Text-to-Speech**: Native TTS framework (e.g., `expo-speech`, `react-native-tts`, or platform TTS APIs)
- **App Language**: English

## Core Features (MVP)

1. **Live Camera Feed** — Continuous camera input processed in real time
2. **Object Detection** — Identifies key objects: `person`, `car`, `dog` (expandable)
3. **Proximity Estimation** — Determines if a detected object is near the user (based on bounding box size / depth estimation)
4. **Natural Language Generation** — Converts detections into human-friendly sentences:
   - *"There is a person in front of you"*
   - *"A car is nearby"*
   - *"A dog is approaching"*
5. **Text-to-Speech Output** — Sentences are spoken aloud through the device speaker
6. **Audio-First UX** — Minimal visual UI; the primary interface is sound

## Detection Logic

- Detection runs on a continuous loop (e.g., every 500ms–1s)
- Only announce objects that exceed a proximity threshold (avoid noise from distant objects)
- Avoid repeating the same announcement too frequently (cooldown per object class)
- Priority order: `person` > `car` > `dog` (can be configured)

## Project Structure (Planned)

```
eyetech/
├── mobile/          # React Native app
│   ├── src/
│   │   ├── components/
│   │   ├── detection/   # Camera capture + API call logic
│   │   ├── tts/         # Text-to-speech wrappers
│   │   └── utils/
│   └── app.json
└── CLAUDE.md
```

## Design Guidelines

- **Bright & clear UI** — High contrast colors, vibrant but not overwhelming palette; the app should feel approachable for both visually impaired and sighted users
- **Large fonts** — Minimum 18sp for body text, 24sp+ for key labels; prioritize readability at a glance
- **Large tap targets** — Buttons and interactive elements should be at least 64×64dp; easy to tap without precise targeting
- **Simple, uncluttered layout** — No complex navigation, no nested menus; one primary action per screen
- **No decorative complexity** — Avoid dense iconography, small labels, or multi-column layouts; every element on screen should have a clear purpose
- **Audio-first, visuals secondary** — UI elements should reinforce what's being spoken, not compete with it

## Conventions

- Language: **English** (UI, TTS output, code comments)
- Keep accessibility at the core — test with screen readers, large tap targets, high contrast
- API calls should be as fast as possible — minimize latency between capture and speech output
- TTS announcements should be short, clear, and calm in tone
- Handle API errors gracefully — never crash silently; fall back to a calm audio message if detection fails

## Out of Scope (for now)

- Web interface
- On-device / local ML model inference
- Multi-language support
- Navigation / GPS guidance
- Indoor mapping
- User accounts / backend
