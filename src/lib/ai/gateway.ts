import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Layered Visual Description schema for structured image analysis
const imageDescriptionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A brief, 1-2 sentence high-level summary of the image suitable for a quick alt-text.'
    },
    detailed: {
      type: Type.STRING,
      description: 'A comprehensive, spatial and semantic description of the image for someone who cannot see it at all. Describe layout, relationships, and key data points.'
    },
    structuredData: {
      type: Type.STRING,
      description: 'If the image is a chart, graph, or table, extract the raw data in a structured text format (e.g. CSV or JSON string). Otherwise, return null.',
      nullable: true
    }
  },
  required: ['summary', 'detailed']
};

/**
 * Abstracts AI Vision capabilities for the exam engine.
 * Generates layered descriptions for accessibility.
 */
export async function describeImage(imageBase64: string, mimeType: string, contextPrompt?: string) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using mock description.");
    return {
      summary: "Mock image summary",
      detailed: "This is a detailed mock description because the AI key is missing.",
      structuredData: null
    };
  }

  const prompt = `Analyze this image for a visually impaired student taking an exam. 
Provide a layered description (summary, detailed, and structured data if applicable).
${contextPrompt ? `Context: ${contextPrompt}` : ''}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType
          }
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: imageDescriptionSchema,
        temperature: 0.2
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as {
        summary: string;
        detailed: string;
        structuredData: string | null;
      };
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("AI Vision Error:", error);
    throw new Error("Failed to generate image description.");
  }
}

/**
 * Socratic Tutor for Practice Mode.
 * Generates a helpful hint without giving away the answer.
 */
export async function generateSocraticHint(questionText: string, options: string[], wrongAttempts: string[]) {
  if (!process.env.GEMINI_API_KEY) {
    return "This is a mock hint. Please check the AI Gateway configuration.";
  }

  const prompt = `You are an accessible, encouraging tutor for a visually impaired student. 
The student is struggling with this multiple-choice question:
"${questionText}"

Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

The student has already guessed: ${wrongAttempts.join(', ') || 'Nothing yet.'}

Provide a short, direct hint that guides them conceptually without revealing the exact answer. 
Keep it concise and screen-reader friendly (no complex markdown, just plain text).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });

    return response.text || "I'm having trouble thinking of a hint right now.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Hint generation is temporarily unavailable.";
  }
}
