// Gerçek dünya nesne yükseklikleri (metre)
const KNOWN_HEIGHTS_M: Record<string, number> = {
  person:  1.70,
  car:     1.50,
  dog:     0.50,
  bicycle: 1.00,
  truck:   2.50,
  bus:     3.00,
  cat:     0.30,
};

// iPhone geniş kamera için yaklaşık odak uzaklığı (320px genişlikte)
// f = (width/2) / tan(FOV/2) = 160 / tan(35°) ≈ 229px
const FOCAL_LENGTH_PX = 229;
const INPUT_HEIGHT_PX = 320;

export function estimateDistanceMeters(
  label: string,
  bboxHeightNorm: number // normalize edilmiş yükseklik (0–1)
): number {
  const knownHeight = KNOWN_HEIGHTS_M[label];
  if (!knownHeight || bboxHeightNorm <= 0.02) return -1;

  const bboxHeightPx = bboxHeightNorm * INPUT_HEIGHT_PX;
  const distance = (knownHeight * FOCAL_LENGTH_PX) / bboxHeightPx;

  if (distance < 0.3 || distance > 20) return -1;

  return Math.round(distance * 10) / 10; // 1 ondalık basamak
}

export function getRegionDepth(
  depthMap: Float32Array,
  mapWidth: number,
  mapHeight: number,
  x1Norm: number,
  y1Norm: number,
  x2Norm: number,
  y2Norm: number
): number {
  const x1 = Math.max(0, Math.floor(x1Norm * mapWidth));
  const y1 = Math.max(0, Math.floor(y1Norm * mapHeight));
  const x2 = Math.min(mapWidth,  Math.ceil(x2Norm * mapWidth));
  const y2 = Math.min(mapHeight, Math.ceil(y2Norm * mapHeight));

  const values: number[] = [];
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      values.push(depthMap[y * mapWidth + x]);
    }
  }

  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)]; // medyan
}
