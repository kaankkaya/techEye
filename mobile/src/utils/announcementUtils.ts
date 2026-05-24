export type DetectedObject = {
  label: string;
  confidence: number;
  distanceMeters?: number;   // metrik mesafe, -1 = hesaplanamadı
  relativeDepth?: number;    // DepthAnything relatif değeri
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

const PRIORITY_ORDER = ['person', 'car', 'dog', 'bicycle', 'truck', 'bus', 'cat'];
const PROXIMITY_THRESHOLD = 0.15;

export function buildAnnouncement(obj: DetectedObject): string {
  const label   = obj.label.toLowerCase();
  const hasDistance = obj.distanceMeters != null && obj.distanceMeters > 0;
  const dist    = hasDistance ? `${obj.distanceMeters!.toFixed(1)} metre uzağınızda ` : '';

  const labels: Record<string, { tr: string; prefix: string }> = {
    person:  { tr: 'kişi',     prefix: 'Önünüzde' },
    car:     { tr: 'araba',    prefix: 'Yakınınızda' },
    dog:     { tr: 'köpek',    prefix: 'Yakınınızda' },
    bicycle: { tr: 'bisiklet', prefix: 'Yakınınızda' },
    truck:   { tr: 'kamyon',   prefix: 'Yakınınızda' },
    bus:     { tr: 'otobüs',   prefix: 'Yakınınızda' },
    cat:     { tr: 'kedi',     prefix: 'Yakınınızda' },
  };

  const entry = labels[label];
  if (!entry) return `${hasDistance ? dist : 'Yakınınızda '}bir ${label} var`;

  if (hasDistance) return `${dist}bir ${entry.tr} var`;
  return `${entry.prefix} bir ${entry.tr} var`;
}

export function isCloseEnough(obj: DetectedObject): boolean {
  // Metrik mesafe varsa 5 metreyi geç olarak kabul et
  if (obj.distanceMeters && obj.distanceMeters > 0) {
    return obj.distanceMeters <= 5;
  }
  if (!obj.boundingBox) return true;
  return obj.boundingBox.width * obj.boundingBox.height >= PROXIMITY_THRESHOLD;
}

export function prioritizeDetections(objects: DetectedObject[]): DetectedObject[] {
  return [...objects].sort((a, b) => {
    // Önce öncelik sırasına göre
    const ai = PRIORITY_ORDER.indexOf(a.label.toLowerCase());
    const bi = PRIORITY_ORDER.indexOf(b.label.toLowerCase());
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    if (ap !== bp) return ap - bp;

    // Aynı öncelikte yakın olan önce
    const ad = a.distanceMeters && a.distanceMeters > 0 ? a.distanceMeters : 999;
    const bd = b.distanceMeters && b.distanceMeters > 0 ? b.distanceMeters : 999;
    return ad - bd;
  });
}
