<div align="center">
  <img src="mobile/assets/icon.png" width="120" alt="eyeTech icon" />

  <h1>eyeTech</h1>

  <p><strong>AI-powered real-time object detection for the visually impaired</strong></p>

  <p>
    <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey?style=flat-square" />
    <img src="https://img.shields.io/badge/built%20with-Expo-000020?style=flat-square&logo=expo" />
    <img src="https://img.shields.io/badge/model-YOLO11n-F97316?style=flat-square" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </p>
</div>

---

## 🦯 What is eyeTech?

**eyeTech** is a social responsibility mobile app designed to give visually impaired individuals real-time awareness of their surroundings. Point your phone's camera at the world — eyeTech detects nearby objects and people, then speaks them aloud in natural Turkish sentences, instantly and on-device.

> *"2.3 metre uzağınızda bir kişi var"*
> *"Yakınınızda bir araba var"*

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Live Detection** | Continuous YOLO11n inference at ~1 fps, fully on-device |
| 📏 **Distance Estimation** | Pinhole camera model — estimates real-world distance from bounding box size |
| 🔊 **Turkish TTS** | Natural speech output via `expo-speech` (tr-TR), with per-object cooldowns |
| 📳 **Haptic Warnings** | Danger / Warning pulses when objects enter critical proximity |
| 🎙️ **Voice Picker** | Choose from device's installed Turkish voices, with live preview |
| ⚙️ **Simple / Advanced Mode** | Tap-anywhere scanning mode for eyes-free operation |
| ♿ **Fully Accessible** | VoiceOver-ready, Reduce Motion support, 64dp minimum tap targets |

---

## 🧠 How It Works

```
📸 Camera Frame
      │
      ▼
  YOLO11n (320×320 ONNX, CoreML)
      │
      ├─ Bounding box + label + confidence
      │
      ▼
  Pinhole Distance Estimation
  distance = (real_height × focal_px) / bbox_height_px
      │
      ▼
  Priority Filter  →  person > car > dog > bicycle > truck > bus > cat
      │
      ▼
  🔊 TTS Announcement  +  📳 Haptic Feedback
```

---

## 📱 Screens

| Loading | Voice Picker | Camera | Settings |
|---|---|---|---|
| Lottie eye animation | Select Turkish TTS voice | Live detection + status | Unit, haptic, voice, mode |

---

## 🛠️ Tech Stack

- **React Native** (Expo bare workflow)
- **YOLO11n** — 10MB ONNX model, CoreML accelerated on iOS
- **onnxruntime-react-native** — local inference, no server needed
- **expo-speech** — TTS, tr-TR, voice selection
- **expo-haptics** — proximity-based haptic feedback
- **expo-camera** — silent frame capture
- **jpeg-js** — JPEG → RGBA pixel decode for model preprocessing
- **Inter** font via `@expo-google-fonts/inter`

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Expo CLI
- Xcode (for iOS)
- CocoaPods

### Install

```bash
git clone https://github.com/your-username/eyetech.git
cd eyetech/mobile
npm install
```

### iOS

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios
```

### Android

```bash
npx expo run:android
```

> **Model files:** Place `yolo11n.onnx` inside `mobile/MLModels/` before building.

---

## 📂 Project Structure

```
eyetech/
├── mobile/
│   ├── MLModels/
│   │   └── yolo11n.onnx          # YOLO11n — 10MB
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraScreen.tsx  # Main scanning screen
│   │   │   ├── LoadingScreen.tsx # Lottie intro animation
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── VoicePickerScreen.tsx
│   │   ├── detection/
│   │   │   ├── yoloInference.ts  # ONNX session + NMS
│   │   │   ├── mlPipeline.ts     # YOLO + distance estimation
│   │   │   └── detectionService.ts
│   │   ├── tts/
│   │   │   └── ttsService.ts     # expo-speech, cooldown, voice persist
│   │   └── utils/
│   │       ├── announcementUtils.ts
│   │       ├── unitService.ts    # Metre / Adım
│   │       ├── proximityHaptics.ts
│   │       └── displayService.ts
│   └── app.json
├── PROD_SPEC.md
├── AGENTS.md
└── CLAUDE.md
```

---

## ♿ Accessibility

eyeTech is built accessibility-first:

- 🎙️ Full **VoiceOver** support with `accessibilityLabel` and `accessibilityHint` on every interactive element
- 🤫 **Reduce Motion** respected — animations are skipped when the system setting is enabled
- 🔤 Minimum **22px** font size throughout
- 👆 Minimum **64×64dp** tap targets
- 📢 Status text uses `accessibilityLiveRegion="polite"` for automatic VoiceOver announcements

---

## 🎯 Detected Objects

| Class | Turkish | Priority |
|---|---|---|
| 👤 `person` | kişi | 1st |
| 🚗 `car` | araba | 2nd |
| 🐕 `dog` | köpek | 3rd |
| 🚲 `bicycle` | bisiklet | 4th |
| 🚛 `truck` | kamyon | 5th |
| 🚌 `bus` | otobüs | 6th |
| 🐈 `cat` | kedi | 7th |

---

## 📄 License

MIT © [Kaan Kaya](https://github.com/rohnin)
