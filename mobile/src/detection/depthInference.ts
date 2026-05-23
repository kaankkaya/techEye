import { Asset } from 'expo-asset';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { prepareImageTensor } from './imagePreprocessor';

// DepthAnything V2 ViT-S standart giriş boyutu
const DEPTH_INPUT_SIZE = 518;

export type DepthMap = {
  data: Float32Array;
  width: number;
  height: number;
};

let _session: InferenceSession | null = null;

export async function initDepth(): Promise<void> {
  if (_session) return;
  console.log('[TechEye] Depth modeli yükleniyor...');
  const [asset] = await Asset.loadAsync(require('../../MLModels/depth_anything_v2_vits.onnx'));
  _session = await InferenceSession.create(asset.localUri!, {
    executionProviders: ['coreml', 'cpu'],
  });
  console.log('[TechEye] Depth modeli hazır');
}

export async function runDepth(imageUri: string): Promise<DepthMap> {
  if (!_session) await initDepth();

  const inputData = await prepareImageTensor(imageUri, DEPTH_INPUT_SIZE, DEPTH_INPUT_SIZE);
  const inputTensor = new Tensor('float32', inputData, [1, 3, DEPTH_INPUT_SIZE, DEPTH_INPUT_SIZE]);

  const results = await _session!.run({ image: inputTensor });
  const output = results['depth'].data as Float32Array;

  return {
    data:   output,
    width:  DEPTH_INPUT_SIZE,
    height: DEPTH_INPUT_SIZE,
  };
}
