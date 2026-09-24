'use server';

import { describeImage, generateSocraticHint } from '@/lib/ai/gateway';

export async function describeImageAction(imageBase64: string, mimeType: string, contextPrompt?: string) {
  try {
    const description = await describeImage(imageBase64, mimeType, contextPrompt);
    return { success: true, data: description };
  } catch (error: any) {
    console.error("describeImageAction Error:", error);
    return { success: false, error: error.message || 'Failed to describe image' };
  }
}

export async function generateHintAction(questionText: string, options: string[], wrongAttempts: string[]) {
  try {
    const hint = await generateSocraticHint(questionText, options, wrongAttempts);
    return { success: true, data: hint };
  } catch (error: any) {
    console.error("generateHintAction Error:", error);
    return { success: false, error: error.message || 'Failed to generate hint' };
  }
}
