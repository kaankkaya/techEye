import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

export async function prepareImageTensor(
  imageUri: string,
  targetWidth: number,
  targetHeight: number
): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: targetWidth, height: targetHeight } }],
    { format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!resized.base64) throw new Error('Image manipulation failed');

  const binaryStr = atob(resized.base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { data, width, height } = jpeg.decode(bytes.buffer as ArrayBuffer, { useTArray: true });

  // RGBA → CHW Float32Array, normalized 0–1
  const numPixels = width * height;
  const tensor = new Float32Array(3 * numPixels);
  for (let i = 0; i < numPixels; i++) {
    tensor[i]                 = data[i * 4]     / 255.0; // R
    tensor[i + numPixels]     = data[i * 4 + 1] / 255.0; // G
    tensor[i + 2 * numPixels] = data[i * 4 + 2] / 255.0; // B
  }

  return tensor;
}
