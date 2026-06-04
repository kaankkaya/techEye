# ML Models

## Models in use

| Model | File | Size | Purpose |
|-------|------|------|---------|
| YOLOv8n | `yolov8n.onnx` | 12.1 MB | Object detection (bounding boxes + class) |
| FastDepth | `fast_depth_224x224.onnx` | 5.4 MB | Monocular depth estimation |

---

## YOLO (`yolov8n.onnx`)

### Export origin
```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
model.export(format='onnx', imgsz=320)
```

### Input
| Key | Shape | Type | Notes |
|-----|-------|------|-------|
| `images` | `[1, 3, 320, 320]` | float32 | RGB, normalized 0–1, CHW layout |

### Output
| Key | Shape | Type | Notes |
|-----|-------|------|-------|
| `output0` | `[1, 84, 2100]` | float32 | Raw candidate boxes; requires client-side NMS |

### Output tensor layout
```
index 0 → x_center (pixel space 0–320)
index 1 → y_center (pixel space 0–320)
index 2 → width    (pixel space 0–320)
index 3 → height   (pixel space 0–320)
indices 4..83 → class scores for the 80 COCO classes
```

### Coordinate normalization
Coordinates come out in **pixel space (0–320)**. The code in `yoloInference.ts` normalizes them to **0.0–1.0**:
```ts
if (x1 > 1.0 || y1 > 1.0 || x2 > 1.0 || y2 > 1.0) {
  x1 /= YOLO_INPUT_SIZE;  // 320
  ...
}
```
Downstream (`mlPipeline.ts`) uses these **already-normalized** values directly — do **not** divide by 320 again.

### Tracked COCO classes
```ts
const TRACKED: Map<number, string> = new Map([
  [0,  'person'],
  [1,  'bicycle'],
  [2,  'car'],
  [5,  'bus'],
  [7,  'truck'],
  [15, 'cat'],
  [16, 'dog'],
]);
```

### Thresholds
| Constant | Value | Location |
|----------|-------|----------|
| `CONF_THRESHOLD` | `0.25` | `yoloInference.ts` |
| `IOU_THRESHOLD` | `0.45` | `yoloInference.ts` |

### Execution providers
```ts
// iOS
['coreml', 'cpu']
// Android — NNAPI is intentionally disabled (see known-bugs.md)
['cpu']
```

### Padding slots
YOLOv10 always outputs 300 slots. Slots with no detection are **not zero-padded** — they contain garbage values with near-zero confidence. Filter strictly by `score < CONF_THRESHOLD`.

---

## FastDepth (`fast_depth_224x224.onnx`)

### Input
| Key | Shape | Type |
|-----|-------|------|
| `input.1` | `[1, 3, 224, 224]` | float32, RGB normalized 0–1, CHW |

### Output
| Key | Shape | Type | Notes |
|-----|-------|------|-------|
| `424` | `[1, 1, 224, 224]` | float32 | Absolute metric depth in **metres** |

> The output node name is `424` — a raw PyTorch intermediate tensor name, not a human-readable label.

### Depth value interpretation
- Values are **absolute metres** (not relative/inverse like MiDaS).
- Cap applied: values > 20 m are clamped to 20 m; values < 0 are treated as missing (-1).
- The median depth within the YOLO bounding box region is used (ignores background noise).

### Execution providers
Same as YOLO — `['cpu']` on Android.

---

## Image preprocessing (`imagePreprocessor.ts`)

Used by **both** models. Always produces a CHW float32 array normalized 0–1.

```ts
// Resize → JPEG → decode → RGBA to CHW RGB
tensor[i]               = R / 255.0;
tensor[i + numPixels]   = G / 255.0;
tensor[i + 2*numPixels] = B / 255.0;
```

Input size must be passed explicitly: 320 for YOLO, 224 for FastDepth.

---

## Depth estimation pipeline (`distanceUtils.ts`)

1. Map normalized YOLO bbox → depth map grid coords (multiply by 224).
2. Extract all depth pixels within the bbox region.
3. Take the **median** (ignores sparse background leakage).
4. Apply EMA smoothing per object slot:
   ```
   smoothed = 0.5 * rawDepth + 0.5 * previousDepth
   ```
5. Objects tracked by `"label#slot"` key (e.g. `person#0`, `person#1`).
6. Objects not seen for 5+ frames are evicted from history.

---

## Unused models

| File | Notes |
|------|-------|
| `midas_small.onnx` + `.data` | Original two-file MiDaS — superseded by FastDepth |
| `midas_small_fused.onnx` | Fused single-file MiDaS — also superseded |

These can be removed to save ~135 MB of bundle size.
