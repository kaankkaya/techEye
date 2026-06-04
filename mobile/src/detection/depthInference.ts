import { Asset } from 'expo-asset';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { prepareImageTensor } from './imagePreprocessor';

export const DEPTH_INPUT_SIZE = 224;

// Pinhole mesafe tahmini bu eşiğin altındaysa depth modeli devreye girer
export const DEPTH_ACTIVATION_THRESHOLD_M = 2;

let _session: InferenceSession | null = null;

export async function initDepth(): Promise<void> {
  if (_session) return;
  console.log('[eyeTech] Depth modeli yükleniyor...');
  const [asset] = await Asset.loadAsync(require('../../MLModels/fast_depth_224x224.onnx'));
  _session = await InferenceSession.create(asset.localUri!, {
    executionProviders: ['coreml', 'cpu'],
  });
  console.log('[eyeTech] Depth modeli hazır');
}

// Depth haritası döner (DEPTH_INPUT_SIZE × DEPTH_INPUT_SIZE, metre cinsinden)
// Model çalışamazsa null döner; çağıran pinhole'a fallback yapar
export async function runDepth(imageUri: string): Promise<Float32Array | null> {
  if (!_session) await initDepth();

  const inputData = await prepareImageTensor(imageUri, DEPTH_INPUT_SIZE, DEPTH_INPUT_SIZE);
  const inputTensor = new Tensor('float32', inputData, [1, 3, DEPTH_INPUT_SIZE, DEPTH_INPUT_SIZE]);

  try {
    const results = await _session!.run({ input: inputTensor });
    const outputKey = Object.keys(results)[0];
    return results[outputKey].data as Float32Array;
  } catch {
    return null;
  }
}

// Bounding box'ın merkez %50'sinin medyan derinliğini döner (metre)
// Geçersiz değerlerde -1 döner
export function sampleDepthAtBbox(
  depthMap: Float32Array,
  bbox: { left: number; top: number; width: number; height: number }
): number {
  const cx = bbox.left + bbox.width * 0.5;
  const cy = bbox.top + bbox.height * 0.5;
  const hw = bbox.width * 0.25;
  const hh = bbox.height * 0.25;

  const x1 = Math.max(0, Math.floor((cx - hw) * DEPTH_INPUT_SIZE));
  const y1 = Math.max(0, Math.floor((cy - hh) * DEPTH_INPUT_SIZE));
  const x2 = Math.min(DEPTH_INPUT_SIZE - 1, Math.ceil((cx + hw) * DEPTH_INPUT_SIZE));
  const y2 = Math.min(DEPTH_INPUT_SIZE - 1, Math.ceil((cy + hh) * DEPTH_INPUT_SIZE));

  const samples: number[] = [];
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const v = depthMap[y * DEPTH_INPUT_SIZE + x];
      if (v >= 0.1 && v <= 15) samples.push(v);
    }
  }

  if (samples.length === 0) return -1;
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  return Math.round(median * 10) / 10;
}
