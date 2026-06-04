# Design Decisions

## DD-1 — NNAPI disabled on Android

**Decision:** Use `['cpu']` only as execution provider for both ONNX sessions on Android.

**Why:** NNAPI produced corrupt outputs on YOLOv10's end-to-end NMS head (TopK operator). Using `['cpu']` gives correct results at the cost of latency.

**Paths to restore hardware acceleration (not yet implemented):**

1. **Export without E2E NMS (recommended):** Re-export the model using `model.export(format='onnx', imgsz=320, opset=12)` without `nms=True`. This produces a `[1, 84, 8400]` raw tensor that consists only of convolutions — no TopK. NNAPI handles this reliably. Post-processing (confidence threshold + NMS) must then be done in JavaScript/TypeScript. The YOLO parsing loop would need to be rewritten.

2. **INT8 quantization:** Convert the model to INT8. This changes the operator types, often sidesteps NNAPI incompatibilities, and substantially reduces inference time. Requires a calibration dataset.

3. **Try a different ONNX opset:** Export with `opset=11` or `opset=13`. Different opsets emit different TopK implementations; one may be more compatible with a given NNAPI driver version.

---

## DD-2 — FastDepth replaces MiDaS

**Decision:** `fast_depth_224x224.onnx` is used for depth estimation instead of `midas_small.onnx`.

**Why:** MiDaS outputs **relative inverse depth** (closer = higher value), not metric depth. FastDepth outputs **absolute metric depth in metres** directly, simplifying the depth pipeline. FastDepth also runs at 224×224 vs MiDaS's 256×256, which is slightly faster.

**Remaining issue:** The MiDaS files (`midas_small.onnx`, `midas_small.onnx.data`, `midas_small_fused.onnx`) are still present in `MLModels/` and bundled with the app, wasting ~135 MB.

---

## DD-3 — Sequential model loading

**Decision:** `initModels()` loads YOLO first, then FastDepth — not in parallel.

**Why:** Concurrent ONNX session creation causes a deadlock in NNAPI's native compiler on Android (observed as `ExpoAsset.downloadAsync` rejection in logs). Sequential loading adds ~1–2s to startup but is reliable.

---

## DD-4 — Detection loop uses `setTimeout` not `setInterval`

**Decision:** `runDetectionLoop` schedules the next frame with `setTimeout(runDetectionLoop, 200)` at the end of its own execution.

**Why:** `setInterval` fires on a wall-clock schedule regardless of whether the previous frame finished. Since each frame can take 1–2 seconds (ONNX inference), overlapping executions would queue up and crash ONNX sessions or exhaust memory. `setTimeout`-chaining ensures exactly one active ONNX session at a time.

---

## DD-5 — Bounding boxes shown in both Dev mode and Gelişmiş display mode

**Decision:** Bounding boxes are rendered when `isScanning && (devMode || displayMode === 'gelismis')`.

**Why:** Gelişmiş ("Advanced") mode is designed to give full visual feedback. Basit ("Simple") mode is intended for one-handed, eyes-free use where box rendering is unnecessary clutter. Dev mode overlays boxes regardless of display mode for debugging.

---

## DD-6 — Object grouping threshold is 0.5 m

**Decision:** Objects within 0.5 m of the closest detected object are grouped into a single announcement.

**Why:** A cyclist (person + bicycle) typically has both objects within ~0.5 m in depth. A car 1 m behind a person should remain a separate warning. 0.5 m was chosen as a practical threshold; may need tuning based on real-world testing.

---

## DD-7 — `isCloseEnough` uses 5 m distance cutoff

**Decision:** Objects beyond 5 m are not announced even if detected.

**Why:** Announcing distant objects would be noise for a visually impaired user navigating on foot. 5 m gives roughly 2–5 seconds of reaction time at walking speed.
