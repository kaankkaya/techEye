# Architecture

## Project layout

```
techEye-main/
├── docs/                    ← This knowledge base
├── mobile/                  ← Expo React Native app
│   ├── MLModels/            ← ONNX model files (not in git if .gitignored)
│   │   ├── yolo11n.onnx         (YOLOv10n exported as yolo11n — 9.3 MB)
│   │   ├── fast_depth_224x224.onnx  (FastDepth — 5.4 MB)
│   │   ├── midas_small.onnx     (not currently used — replaced by FastDepth)
│   │   └── midas_small_fused.onnx  (not currently used)
│   └── src/
│       ├── components/
│       │   ├── CameraScreen.tsx    ← Main screen, all logic orchestration
│       │   ├── SettingsScreen.tsx  ← Settings drawer (slide-from-left)
│       │   ├── ScanningEye.tsx     ← Animated eye icon
│       │   ├── AppText.tsx         ← Typography wrapper
│       │   ├── HapticButton.tsx    ← Pressable with haptic feedback
│       │   ├── LoadingScreen.tsx   ← Splash/loading state
│       │   └── VoicePickerScreen.tsx ← (legacy; voices now in SettingsScreen)
│       ├── detection/
│       │   ├── detectionService.ts  ← Public API: detectObjects()
│       │   ├── mlPipeline.ts        ← Orchestrates YOLO + FastDepth
│       │   ├── yoloInference.ts     ← YOLO ONNX session + postprocessing
│       │   ├── midasInference.ts    ← FastDepth ONNX session
│       │   └── imagePreprocessor.ts ← JPEG → CHW Float32Array
│       ├── tts/
│       │   └── ttsService.ts        ← expo-speech wrapper, cooldown, persistence
│       ├── utils/
│       │   ├── announcementUtils.ts ← buildAnnouncement(), buildGroupAnnouncement()
│       │   ├── distanceUtils.ts     ← EMA depth smoothing, slot tracking
│       │   ├── displayService.ts    ← 'basit' / 'gelismis' mode persistence
│       │   ├── unitService.ts       ← 'metre' / 'adim' unit persistence
│       │   └── proximityHaptics.ts  ← Haptic warning rules
│       └── theme/
│           └── ThemeContext.tsx     ← App-wide dark theme tokens
├── Development/             ← Python scripts (model export, server, etc.)
│   ├── export_models.py     ← Export YOLO + MiDaS to ONNX
│   └── eyetech_env/         ← Python venv (has onnxruntime 1.26.0)
└── test-detection.html      ← Browser-based Gemini API test page
```

## Data flow (one detection frame)

```
CameraScreen
  └─ takePictureAsync()  →  photo.uri
        │
        ▼
detectionService.detectObjects(uri, w, h)
        │
        ▼
mlPipeline.detectWithDistance(uri, w, h)
        ├─ yoloInference.runYolo(uri)
        │     └─ imagePreprocessor.prepareImageTensor(uri, 320, 320)
        │           → Float32Array [1, 3, 320, 320]
        │     → YoloDetection[] (x1,y1,x2,y2 normalized 0–1, confidence, label)
        │
        ├─ midasInference.runMidas(uri)  (runs concurrently with YOLO)
        │     └─ imagePreprocessor.prepareImageTensor(uri, 224, 224)
        │     → Float32Array [224×224] depth map (metric metres)
        │
        └─ For each YOLO detection:
              distanceUtils.estimateTrueDepth(label, left,top,right,bottom, depthMap, 224)
              → EMA-smoothed distance in metres
              → DetectedObject { label, confidence, distanceMeters, boundingBox }

CameraScreen (on result)
  ├─ setDetections()            → bounding box overlay re-render
  ├─ evaluateProximityHaptics() → haptic warnings
  └─ buildGroupAnnouncement()   → TTS via ttsService.speak()
```

## Detection loop timing

- Frame interval: **200 ms** (`DETECTION_INTERVAL_MS`)
- Loop type: sequential — next frame starts only after current frame fully completes
- Pattern: `setTimeout(runDetectionLoop, 200)` inside `runDetectionLoop` callback

## Display modes

| Key | Turkish | Description |
|-----|---------|-------------|
| `gelismis` | Gelişmiş | Full HUD: ScanningEye, status text, Tara/Durdur button, bounding boxes |
| `basit` | Basit | Tap-anywhere to start/stop; only ScanningEye and settings button visible |
