import { DetectedObject } from '../utils/announcementUtils';
import { runYolo, initYolo, YOLO_INPUT_SIZE } from './yoloInference';
import { estimateDistanceMeters } from '../utils/distanceUtils';

export async function initModels(): Promise<void> {
  console.log('[TechEye] YOLO modeli yükleniyor...');
  await initYolo();
  console.log('[TechEye] Model hazır');
}

export async function detectWithDistance(
  photoUri: string,
  _imageWidth: number,
  _imageHeight: number
): Promise<DetectedObject[]> {
  const yoloResults = await runYolo(photoUri);

  console.log(`[TechEye] YOLO: ${yoloResults.length} nesne`);

  return yoloResults.map((det) => {
    // YOLO çıktısı piksel koordinatı (0–320) — normalize et
    const left   = det.x1 / YOLO_INPUT_SIZE;
    const top    = det.y1 / YOLO_INPUT_SIZE;
    const bboxW  = (det.x2 - det.x1) / YOLO_INPUT_SIZE;
    const bboxH  = (det.y2 - det.y1) / YOLO_INPUT_SIZE;

    const distanceMeters = estimateDistanceMeters(det.label, bboxH);

    console.log(
      `[TechEye] ${det.label}: ${distanceMeters > 0 ? distanceMeters + 'm' : 'mesafe?'} | conf=${(det.confidence * 100).toFixed(1)}%`
    );

    return {
      label:      det.label,
      confidence: det.confidence,
      distanceMeters,
      boundingBox: { left, top, width: bboxW, height: bboxH },
    };
  });
}
