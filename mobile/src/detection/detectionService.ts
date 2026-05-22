import { DetectedObject } from '../utils/announcementUtils';

const HF_API_URL =
  'https://api-inference.huggingface.co/models/facebook/detr-resnet-50';
const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY ?? '';

const TRACKED_LABELS = new Set(['person', 'car', 'dog', 'bicycle', 'truck', 'bus', 'cat']);

type HFDetection = {
  score: number;
  label: string;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function detectObjects(
  base64Image: string,
  imageWidth: number,
  imageHeight: number
): Promise<DetectedObject[]> {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/octet-stream',
    },
    body: base64ToUint8Array(base64Image).buffer as ArrayBuffer,
  });

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status}`);
  }

  const detections: HFDetection[] = await response.json();
  const imageArea = imageWidth * imageHeight;

  return detections
    .filter((d) => TRACKED_LABELS.has(d.label.toLowerCase()) && d.score > 0.6)
    .map((d) => {
      const w = (d.box.xmax - d.box.xmin) / imageWidth;
      const h = (d.box.ymax - d.box.ymin) / imageHeight;
      return {
        label: d.label.toLowerCase(),
        confidence: d.score,
        boundingBox: {
          left: d.box.xmin / imageWidth,
          top: d.box.ymin / imageHeight,
          width: w,
          height: h,
        },
      };
    });
}
