import { Asset } from 'expo-asset';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { prepareImageTensor } from './imagePreprocessor';

export const YOLO_INPUT_SIZE = 320;
const CONF_THRESHOLD  = 0.45;
const IOU_THRESHOLD   = 0.45;

// 320×320 input için anchor sayısı: 40²+20²+10² = 2100
const NUM_ANCHORS = 2100;

// Takip edilen COCO sınıf ID'leri
const TRACKED: Map<number, string> = new Map([
  [0,  'person'],
  [1,  'bicycle'],
  [2,  'car'],
  [5,  'bus'],
  [7,  'truck'],
  [15, 'cat'],
  [16, 'dog'],
]);

export type YoloDetection = {
  label: string;
  confidence: number;
  x1: number; y1: number; x2: number; y2: number; // normalize 0–1
};

let _session: InferenceSession | null = null;

export async function initYolo(): Promise<void> {
  if (_session) return;
  console.log('[eyeTech] YOLO modeli yükleniyor...');
  const [asset] = await Asset.loadAsync(require('../../MLModels/yolo11n.onnx'));
  _session = await InferenceSession.create(asset.localUri!, {
    executionProviders: ['coreml', 'cpu'],
  });
  console.log('[eyeTech] YOLO modeli hazır');
}

export async function runYolo(imageUri: string): Promise<YoloDetection[]> {
  if (!_session) await initYolo();

  const inputData = await prepareImageTensor(imageUri, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE);
  const inputTensor = new Tensor('float32', inputData, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]);

  let results;
  try {
    results = await _session!.run({ images: inputTensor });
  } catch {
    return [];
  }

  if (!results['output0']) return [];
  const output = results['output0'].data as Float32Array;

  // Output shape: [1, 84, 2100] → flat index: feature * NUM_ANCHORS + anchor
  const raw: YoloDetection[] = [];

  for (let i = 0; i < NUM_ANCHORS; i++) {
    let maxScore = 0;
    let bestId   = -1;

    for (const [id] of TRACKED) {
      const score = output[(id + 4) * NUM_ANCHORS + i];
      if (score > maxScore) { maxScore = score; bestId = id; }
    }

    if (maxScore < CONF_THRESHOLD || bestId === -1) continue;

    const cx = output[0 * NUM_ANCHORS + i];
    const cy = output[1 * NUM_ANCHORS + i];
    const w  = output[2 * NUM_ANCHORS + i];
    const h  = output[3 * NUM_ANCHORS + i];

    raw.push({
      label:      TRACKED.get(bestId)!,
      confidence: maxScore,
      x1: cx - w / 2,
      y1: cy - h / 2,
      x2: cx + w / 2,
      y2: cy + h / 2,
    });
  }

  return nms(raw);
}

function nms(dets: YoloDetection[]): YoloDetection[] {
  const sorted = [...dets].sort((a, b) => b.confidence - a.confidence);
  const kept: YoloDetection[] = [];
  for (const det of sorted) {
    if (!kept.some(k => iou(det, k) > IOU_THRESHOLD)) kept.push(det);
  }
  return kept;
}

function iou(a: YoloDetection, b: YoloDetection): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter);
}
