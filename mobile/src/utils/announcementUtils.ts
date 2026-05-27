import { formatDistance } from './unitService';

export type DetectedObject = {
  label: string;
  confidence: number;
  distanceMeters?: number;
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

const PRIORITY_ORDER = ['person', 'car', 'dog', 'bicycle', 'truck', 'bus', 'cat'];
const PROXIMITY_THRESHOLD = 0.15;

const LABELS: Record<string, { tr: string; noDistPrefix: string }> = {
  person:  { tr: 'kişi',     noDistPrefix: 'Önünüzde' },
  car:     { tr: 'araba',    noDistPrefix: 'Yakınınızda' },
  dog:     { tr: 'köpek',    noDistPrefix: 'Yakınınızda' },
  bicycle: { tr: 'bisiklet', noDistPrefix: 'Yakınınızda' },
  truck:   { tr: 'kamyon',   noDistPrefix: 'Yakınınızda' },
  bus:     { tr: 'otobüs',   noDistPrefix: 'Yakınınızda' },
  cat:     { tr: 'kedi',     noDistPrefix: 'Yakınınızda' },
};

export function buildAnnouncement(obj: DetectedObject): string {
  const entry = LABELS[obj.label.toLowerCase()];
  const tr = entry?.tr ?? obj.label;
  const dist = formatDistance(obj.distanceMeters ?? -1);

  if (dist) {
    return `${dist} uzağınızda bir ${tr} var`;
  }

  const prefix = entry?.noDistPrefix ?? 'Yakınınızda';
  return `${prefix} bir ${tr} var`;
}

export function isCloseEnough(obj: DetectedObject): boolean {
  if (obj.distanceMeters && obj.distanceMeters > 0) {
    return obj.distanceMeters <= 5;
  }
  if (!obj.boundingBox) return true;
  return obj.boundingBox.width * obj.boundingBox.height >= PROXIMITY_THRESHOLD;
}

export function prioritizeDetections(objects: DetectedObject[]): DetectedObject[] {
  return [...objects].sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf(a.label.toLowerCase());
    const bi = PRIORITY_ORDER.indexOf(b.label.toLowerCase());
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    if (ap !== bp) return ap - bp;

    const ad = a.distanceMeters && a.distanceMeters > 0 ? a.distanceMeters : 999;
    const bd = b.distanceMeters && b.distanceMeters > 0 ? b.distanceMeters : 999;
    return ad - bd;
  });
}
