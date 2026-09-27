import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * Deterministic fallback descriptions for local exam diagram assets.
 * Guarantees zero failure for visually impaired candidates even during network offline states or quota limits.
 */
const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  'quant-geometry.svg':
    'The diagram displays a right-angled triangle labeled ABC with the right angle at vertex B. Vertical side AB is labeled 5 cm. The hypotenuse AC is labeled 13 cm. The horizontal base BC is marked with a question mark indicating an unknown length.',
  'reasoning-barchart.svg':
    "The diagram is a vertical bar chart titled 'Wheat Production (in 1000 Metric Tons)'. The vertical y-axis represents production volume scaled from 0 to 100. The horizontal x-axis displays four consecutive years: 2018 has a bar value of 45, 2019 has a bar value of 60, 2020 has a bar value of 85, and 2021 has a bar value of 70.",
  'gk-circuit.svg':
    'The diagram illustrates a closed direct-current electrical circuit powered by a 12 Volt DC battery source. Two resistors are connected in series along the upper wire: resistor R1 with a value of 4 Ohms, followed by resistor R2 with a value of 6 Ohms.',
  'english-flowchart.svg':
    "The diagram presents a sequential four-stage industrial recycling process flowchart connected by directional arrows: Stage 1 is 'Collection', pointing forward to Stage 2 'Sorting & Cleaning', pointing forward to Stage 3 'Reprocessing', pointing forward to Stage 4 'Manufacturing'.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid imageUrl parameter' },
        { status: 400 }
      );
    }

    const filename = path.basename(imageUrl.split('?')[0]);
    const fallback = FALLBACK_DESCRIPTIONS[filename];

    const apiKey = process.env.GEMINI_API_KEY;

    let base64Data = '';
    let mimeType = 'image/svg+xml';
    let fileText = '';

    // Load image from local disk if it's a relative path in public/
    if (imageUrl.startsWith('/') || imageUrl.startsWith('diagrams/')) {
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      const fullPath = path.join(process.cwd(), 'public', cleanPath);

      try {
        const fileBuffer = await fs.readFile(fullPath);
        base64Data = fileBuffer.toString('base64');
        if (cleanPath.endsWith('.svg')) {
          mimeType = 'image/svg+xml';
          fileText = fileBuffer.toString('utf-8');
        } else if (cleanPath.endsWith('.png')) {
          mimeType = 'image/png';
        } else if (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg')) {
          mimeType = 'image/jpeg';
        }
      } catch (err) {
        console.warn(`[DescribeDiagram] Local file not found: ${fullPath}`, err);
      }
    } else if (imageUrl.startsWith('data:')) {
      // Data URL
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    } else if (imageUrl.startsWith('http')) {
      // Remote URL
      try {
        const res = await fetch(imageUrl);
        const arrayBuffer = await res.arrayBuffer();
        base64Data = Buffer.from(arrayBuffer).toString('base64');
        mimeType = res.headers.get('content-type') || 'image/png';
      } catch (err) {
        console.warn(`[DescribeDiagram] Failed to fetch remote URL: ${imageUrl}`, err);
      }
    }

    // If Gemini API Key is configured, attempt multimodal vision analysis
    if (apiKey && apiKey.length > 5) {
      try {
        const systemInstruction =
          'Act as a neutral, objective exam scribe for a visually impaired candidate taking a competitive examination. ' +
          'Objectively describe the diagram type, axes, coordinate labels, values, angles, shapes, and geometry step-by-step. ' +
          'NEVER solve the question, NEVER calculate unknown values or answers, and NEVER hint at the correct option.';

        const promptText = fileText
          ? `Here is the exam diagram vector specification:\n\n${fileText.slice(0, 3000)}\n\nPlease provide an accessible, objective step-by-step visual description of this diagram for a candidate who is visually impaired. Describe all visual labels, shapes, and values clearly.`
          : 'Please provide an accessible, objective visual description of this exam diagram for a visually impaired candidate. Describe all visual labels, shapes, and values clearly.';

        const parts: any[] = [{ text: promptText }];

        if (base64Data && mimeType !== 'image/svg+xml') {
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                parts,
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 600,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (candidateText && candidateText.trim().length > 10) {
            return NextResponse.json({
              success: true,
              description: candidateText.trim(),
              source: 'gemini-vision',
            });
          }
        } else {
          const errText = await geminiRes.text();
          console.warn('[DescribeDiagram] Gemini API error response:', errText);
        }
      } catch (geminiErr) {
        console.warn('[DescribeDiagram] Gemini request exception:', geminiErr);
      }
    }

    // High-fidelity fallback if Gemini vision API was not reached or errored
    if (fallback) {
      return NextResponse.json({
        success: true,
        description: fallback,
        source: 'authoritative-scribe-fallback',
      });
    }

    return NextResponse.json({
      success: true,
      description:
        'The question contains a visual examination diagram. Use Alt+D or consult your designated examination scribe for detailed visual layout.',
      source: 'generic-fallback',
    });
  } catch (error: any) {
    console.error('[DescribeDiagram] Unhandled error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
