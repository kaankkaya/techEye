import { DetectedObject } from '../utils/announcementUtils';
import { runYolo, initYolo, YOLO_INPUT_SIZE } from './yoloInference';
import { estimateDistanceMeters } from '../utils/distanceUtils';
import {
  initDepth,
  runDepth,
  sampleDepthAtBbox,
  DEPTH_ACTIVATION_THRESHOLD_M,
} from './depthInference';

// Son frame'de depth modeli kullanıldıysa true — CameraScreen DEV göstergesi okur
export let lastFrameUsedDepth = false;

export async function initModels(): Promise<void> {
  console.log('[eyeTech] Modeller yükleniyor...');
  await Promise.all([initYolo(), initDepth()]);
  console.log('[eyeTech] Modeller hazır');
}

export async function detectWithDistance(
  photoUri: string,
  _imageWidth: number,
  _imageHeight: number
): Promise<DetectedObject[]> {
  const yoloResults = await runYolo(photoUri);
  console.log(`[eyeTech] YOLO: ${yoloResults.length} nesne`);

  // İlk geçiş: normalize bbox + pinhole mesafe tahmini
  const detections = yoloResults.map((det) => {
    const left   = det.x1 / YOLO_INPUT_SIZE;
    const top    = det.y1 / YOLO_INPUT_SIZE;
    const bboxW  = (det.x2 - det.x1) / YOLO_INPUT_SIZE;
    const bboxH  = (det.y2 - det.y1) / YOLO_INPUT_SIZE;
    return {
      det,
      pinholeDistance: estimateDistanceMeters(det.label, bboxH),
      boundingBox: { left, top, width: bboxW, height: bboxH },
    };
  });

  // Depth tetikleme koşulu:
  // 1) Pinhole ≤ eşik → kesin yakın
  // 2) Pinhole hesaplanamadı (-1) ama bbox yüksekliği ≥ 0.35 → büyük ihtimalle yakın
  //    (0.35, 320px girişte ~2-3m mesafeyi kapsar; YOLO partial-clip durumlarını da yakalar)
  const DEPTH_BBOX_TRIGGER_H = 0.35;
  const needsDepthFn = (pinholeDistance: number, bboxH: number) =>
    (pinholeDistance > 0 && pinholeDistance <= DEPTH_ACTIVATION_THRESHOLD_M) ||
    (pinholeDistance <= 0 && bboxH >= DEPTH_BBOX_TRIGGER_H);

  const needsDepth = detections.some(d => needsDepthFn(d.pinholeDistance, d.boundingBox.height));

  let depthMap: Float32Array | null = null;
  if (needsDepth) {
    depthMap = await runDepth(photoUri);
  }
  lastFrameUsedDepth = depthMap !== null;

  return detections.map(({ det, pinholeDistance, boundingBox }) => {
    const inDepthZone = needsDepthFn(pinholeDistance, boundingBox.height);
    let distanceMeters = pinholeDistance;
    let source = 'pinhole';

    if (depthMap && inDepthZone) {
      const depthEstimate = sampleDepthAtBbox(depthMap, boundingBox);
      if (depthEstimate > 0) {
        distanceMeters = depthEstimate;
        source = 'depth';
      }
    }

    console.log(
      `[eyeTech] ${det.label}: ${distanceMeters > 0 ? distanceMeters + 'm' : 'mesafe?'} (${source}) | conf=${(det.confidence * 100).toFixed(1)}%`
    );

    return {
      label:        det.label,
      confidence:   det.confidence,
      distanceMeters,
      boundingBox,
    };
  });
}
