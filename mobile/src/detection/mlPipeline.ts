import { DetectedObject } from '../utils/announcementUtils';
import { runYolo, initYolo } from './yoloInference';
import { runDepth, initDepth } from './depthInference';
import { estimateDistanceMeters, getRegionDepth } from '../utils/distanceUtils';

export async function initModels(): Promise<void> {
  console.log('[TechEye] Modeller paralel yükleniyor...');
  await Promise.all([initYolo(), initDepth()]);
  console.log('[TechEye] Tüm modeller hazır');
}

export async function detectWithDistance(
  photoUri: string,
  _imageWidth: number,
  _imageHeight: number
): Promise<DetectedObject[]> {
  // YOLO ve DepthAnything paralel çalışır
  const [yoloResults, depthMap] = await Promise.all([
    runYolo(photoUri),
    runDepth(photoUri),
  ]);

  console.log(`[TechEye] YOLO: ${yoloResults.length} nesne | Depth map: ${depthMap.width}×${depthMap.height}`);

  return yoloResults.map((det) => {
    const bboxH = det.y2 - det.y1;
    const bboxW = det.x2 - det.x1;

    // Bounding box boyutundan metrik mesafe tahmini
    const distanceMeters = estimateDistanceMeters(det.label, bboxH);

    // DepthAnything'den bölgesel derinlik değeri (karşılaştırma için)
    const relativeDepth = getRegionDepth(
      depthMap.data,
      depthMap.width,
      depthMap.height,
      det.x1, det.y1, det.x2, det.y2
    );

    console.log(
      `[TechEye] ${det.label}: ${distanceMeters > 0 ? distanceMeters + 'm' : 'mesafe?'} | ` +
      `depth=${relativeDepth.toFixed(3)} | conf=${(det.confidence * 100).toFixed(1)}%`
    );

    return {
      label:         det.label,
      confidence:    det.confidence,
      distanceMeters,
      relativeDepth,
      boundingBox: {
        left:   det.x1,
        top:    det.y1,
        width:  bboxW,
        height: bboxH,
      },
    };
  });
}
