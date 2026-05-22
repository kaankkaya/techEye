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
      return 'There is a person in front of you';
    case 'car':
      return 'A car is nearby';
    case 'dog':
      return 'A dog is approaching';
    default:
      return `There is a ${label} nearby`;
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
