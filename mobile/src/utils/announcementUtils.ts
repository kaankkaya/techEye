export type DetectedObject = {
  label: string;
  confidence: number;
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

const PRIORITY_ORDER = ['person', 'car', 'dog'];
const PROXIMITY_THRESHOLD = 0.15; // bounding box area ratio

export function buildAnnouncement(obj: DetectedObject): string {
  const label = obj.label.toLowerCase();

  switch (label) {
    case 'person':
      return 'Önünüzde bir kişi var';
    case 'car':
      return 'Yakınınızda bir araba var';
    case 'dog':
      return 'Bir köpek yaklaşıyor';
    case 'bicycle':
      return 'Yakınınızda bir bisiklet var';
    case 'truck':
      return 'Yakınınızda bir kamyon var';
    case 'bus':
      return 'Yakınınızda bir otobüs var';
    case 'cat':
      return 'Yakınınızda bir kedi var';
    default:
      return `Yakınınızda bir ${label} var`;
  }
}

export function isCloseEnough(obj: DetectedObject): boolean {
  if (!obj.boundingBox) return true;
  const area = obj.boundingBox.width * obj.boundingBox.height;
  return area >= PROXIMITY_THRESHOLD;
}

export function prioritizeDetections(objects: DetectedObject[]): DetectedObject[] {
  return [...objects].sort((a, b) => {
    const aIdx = PRIORITY_ORDER.indexOf(a.label.toLowerCase());
    const bIdx = PRIORITY_ORDER.indexOf(b.label.toLowerCase());
    const aPriority = aIdx === -1 ? 999 : aIdx;
    const bPriority = bIdx === -1 ? 999 : bIdx;
    return aPriority - bPriority;
  });
}
