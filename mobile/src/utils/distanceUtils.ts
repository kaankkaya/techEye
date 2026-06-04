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

// Bbox yüksekliği bu eşiği aştığında nesne çerçeveyi taşıyor olabilir;
// pinhole modeli güvenilmez → -1 dönerek "Önünüzde bir X var" duyurusuna düşülür.
const TOO_CLOSE_BBOX_THRESHOLD = 0.85;

export function estimateDistanceMeters(
  label: string,
  bboxHeightNorm: number // normalize edilmiş yükseklik (0–1)
): number {
  const knownHeight = KNOWN_HEIGHTS_M[label];
  if (!knownHeight || bboxHeightNorm <= 0.02) return -1;
  if (bboxHeightNorm >= TOO_CLOSE_BBOX_THRESHOLD) return -1;

  const bboxHeightPx = bboxHeightNorm * INPUT_HEIGHT_PX;
  const distance = (knownHeight * FOCAL_LENGTH_PX) / bboxHeightPx;

  if (distance < 0.3 || distance > 20) return -1;

  return Math.round(distance * 10) / 10; // 1 ondalık basamak
}
