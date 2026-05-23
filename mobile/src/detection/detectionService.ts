import { DetectedObject } from '../utils/announcementUtils';
import { detectWithDistance } from './mlPipeline';

export async function detectObjects(
  photoUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<DetectedObject[]> {
  const t0 = Date.now();
  console.log('[TechEye] ML pipeline başlatılıyor...');

  const results = await detectWithDistance(photoUri, imageWidth, imageHeight);

  console.log(`[TechEye] Pipeline tamamlandı: ${Date.now() - t0}ms | ${results.length} nesne`);
  return results;
}
