import Groq from 'groq-sdk';

/**
 * Server-only AI configuration and client factory for Exam Saarthi.
 * Centralizes model selection and API key validation across all server routes.
 */

export const AI_CONFIG = {
  // Voice Intent Classifier fallback model (default: openai/gpt-oss-20b)
  INTENT_MODEL: process.env.GROQ_INTENT_MODEL || 'openai/gpt-oss-20b',

  // Post-exam tutor summary model (default: openai/gpt-oss-20b)
  TUTOR_MODEL: process.env.GROQ_TUTOR_MODEL || 'openai/gpt-oss-20b',

  // Sarthi interactive assistant model (default: openai/gpt-oss-120b)
  SARTHI_MODEL: process.env.GROQ_SARTHI_MODEL || 'openai/gpt-oss-120b',
} as const;

let _groqClient: Groq | null = null;

/**
 * Returns a shared Groq client instance if GROQ_API_KEY is defined.
 * Returns null if the API key is missing or empty, allowing routes
 * to degrade gracefully without throwing initialization exceptions.
 */
export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey });
  }
  return _groqClient;
}

/**
 * Helper to check if Groq AI service is configured in the current environment.
 */
export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}
