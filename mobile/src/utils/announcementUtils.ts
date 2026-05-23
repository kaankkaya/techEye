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
  const label = obj.label.toLowerCase();
  const dist  = obj.distanceMeters && obj.distanceMeters > 0
    ? `${obj.distanceMeters.toFixed(1)} metre uzağınızda `
    : '';

  switch (label) {
    case 'person':   return `${dist}bir kişi var`;
    case 'car':      return `${dist}bir araba var`;
    case 'dog':      return `${dist}bir köpek var`;
    case 'bicycle':  return `${dist}bir bisiklet var`;
    case 'truck':    return `${dist}bir kamyon var`;
    case 'bus':      return `${dist}bir otobüs var`;
    case 'cat':      return `${dist}bir kedi var`;
    default:         return `${dist}bir ${label} var`;
  }
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
