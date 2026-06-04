# Known Bugs & Fixes

## Bug 1 — YOLO ghost detections at 100% confidence (FIXED)

**Symptom:** The model continuously reported `person`, `bicycle`, `car` all at 100% confidence even when the camera was pointed at an empty wall or unrelated scene. Raw output was always `[-12, -12, 20, 12, 1, 11]` (static, non-changing values).

**Root cause:** NNAPI on the test device (TECNO LF7n) incorrectly compiled the YOLOv10 end-to-end NMS head. The `TopK` operator inside the E2E NMS graph produced corrupt constant outputs instead of real predictions.

**Fix:** Changed execution provider on Android from `['nnapi', 'cpu']` to `['cpu']` in both `yoloInference.ts` and `midasInference.ts`.

**Files changed:**
- `src/detection/yoloInference.ts` — line 41
- `src/detection/midasInference.ts` — line 18–20

**Performance trade-off:** CPU is slower than NNAPI. If a device supports NNAPI correctly, re-enabling it would improve latency. See `decisions.md` for the options available to restore NNAPI with reliable results.

---

## Bug 2 — Bounding boxes not visible on screen (FIXED)

**Symptom:** Dev mode showed no bounding boxes on the camera preview even when YOLO detected objects.

**Root cause:** In `mlPipeline.ts`, bounding box coordinates (`det.x1` etc.) were divided by `YOLO_INPUT_SIZE` (320) a second time. Since `yoloInference.ts` already normalizes them to 0–1, the second division produced values like `0.004`, making the boxes sub-pixel in size.

**Fix:** Removed the division in `mlPipeline.ts`. Coordinates are now passed directly as already-normalized values.

**Files changed:**
- `src/detection/mlPipeline.ts` — lines 33–40

---

## Bug 3 — Periodic white screen flash during scanning (FIXED)

**Symptom:** Camera preview flashed white briefly on every scan cycle (approximately every 200–400 ms).

**Root cause:** `expo-camera`'s default shutter animation fires on every `takePictureAsync()` call, even with `flash="off"` set. At 200 ms intervals this caused a visible strobe effect.

**Fix:** Added `animateShutter={false}` to `<CameraView>`. Also added `key="camera-preview"` to prevent React from unmounting/remounting the camera component on state updates.

**Files changed:**
- `src/components/CameraScreen.tsx` — `<CameraView>` props

---

## Bug 4 — Cooldown slider stuck at 0.5s (FIXED)

**Symptom:** Dragging the `Tekrar Süresi` slider in Settings resulted in the value always snapping back to 0.5s (the minimum), regardless of where the user dragged.

**Root cause:** The `PanResponder` on the slider container used `evt.nativeEvent.locationX` to calculate the touch position. When the user's finger landed on the track or thumb child views, the coordinate space changed to those subviews' local bounds (which start at 0 regardless of position), causing the slider to calculate an incorrect 0–1 fraction.

**Fix:** Added `pointerEvents="none"` to the track and thumb `<View>` elements so all touch events bubble up to the parent container, which provides a consistent coordinate space.

**Files changed:**
- `src/components/SettingsScreen.tsx` — `CustomSlider` component, lines 109–112

---

## Bug 5 — FastDepth failing to load (FIXED, prior session)

**Symptom:** `ExpoAsset.downloadAsync` rejection during `initMidas()` on cold start.

**Root cause:** Both YOLO and FastDepth were initialized concurrently (`Promise.all`). NNAPI's model compiler is not re-entrant — loading two models in parallel caused a deadlock or memory fault inside NNAPI's native layer.

**Fix:** Changed `initModels()` to initialize models sequentially (`await initYolo()` then `await initMidas()`).

**Files changed:**
- `src/detection/mlPipeline.ts` — `initModels()` function
