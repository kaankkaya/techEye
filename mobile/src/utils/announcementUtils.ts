import { getDistanceLabel } from './distanceUtils';

export type DetectedObject = {
  label: string;
  confidence: number;
  distanceMeters?: number;
  relativeDepth?: number;
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
  const label = obj.label.toLowerCase();
  const bboxH = obj.boundingBox?.height ?? 0;
  const distLabel = getDistanceLabel(obj.distanceMeters ?? -1, bboxH);

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
  const prefix = entry?.prefix ?? 'Yakınınızda';
  const tr = entry?.tr ?? label;

  return `${prefix} bir ${tr} var, ${distLabel}`;
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
