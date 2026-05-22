import { DetectedObject } from '../utils/announcementUtils';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const PROMPT =
  'You are an object detection system for a visually impaired person\'s assistant app. ' +
  'Analyze this image and identify the following objects ONLY if they appear close or prominent in the frame: ' +
  'person, car, dog, bicycle, truck, bus, cat. ' +
  'Ignore objects that are small or far away. ' +
  'Return ONLY a valid JSON array with no markdown, no code block, no extra text. Example: ' +
  '[{"label":"person","confidence":0.95},{"label":"car","confidence":0.8}] ' +
  'If no relevant objects are close or prominent, return exactly: []';

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

export async function detectObjects(
  base64Image: string,
  _imageWidth: number,
  _imageHeight: number
): Promise<DetectedObject[]> {
  const startTime = Date.now();
  console.log('[TechEye] Sending image to Gemini API...');

  if (!GEMINI_API_KEY) {
    console.error('[TechEye] Gemini API key is not set');
    throw new Error('Gemini API key missing');
  }

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image,
            },
          },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[TechEye] API request failed — status: ${response.status}, duration: ${elapsed}ms, body: ${body}`);
    throw new Error(`Gemini API error: ${response.status} ${body}`);
  }

  const data: GeminiResponse = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  console.log(`[TechEye] API responded in ${elapsed}ms — raw: ${rawText}`);

  let parsed: { label: string; confidence: number }[] = [];
  try {
    const cleaned = rawText.trim().replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[TechEye] Failed to parse Gemini response:', rawText);
    return [];
  }

  const results: DetectedObject[] = parsed
    .filter((d) => typeof d.label === 'string' && typeof d.confidence === 'number')
    .map((d) => ({
      label: d.label.toLowerCase(),
      confidence: d.confidence,
    }));

  console.log(
    `[TechEye] Detected ${results.length} object(s):`,
    results.map((d) => `${d.label} (${(d.confidence * 100).toFixed(1)}%)`).join(', ') || 'none'
  );

  return results;
}
