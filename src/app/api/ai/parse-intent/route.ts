import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VALID_INTENTS = [
  'NAVIGATE_DASHBOARD',
  'NAVIGATE_PRACTICE',
  'NAVIGATE_EXAMS',
  'NAVIGATE_RESULTS',
  'NAVIGATE_SETTINGS',
  'NAVIGATE_BACK',
  'START_EXAM',
  'START_PRACTICE',
  'DESCRIBE_DIAGRAM',
  'NEXT_QUESTION',
  'PREVIOUS_QUESTION',
  'CLEAR_RESPONSE',
  'SELECT_OPTION',
  'SUBMIT_EXAM',
  'SWITCH_TO_ENGLISH',
  'SWITCH_TO_HINDI',
  'UNKNOWN',
] as const;

type CanonicalIntent = (typeof VALID_INTENTS)[number];

interface IntentResponse {
  intent: CanonicalIntent;
  confidence: number;
  optionLetter?: 'A' | 'B' | 'C' | 'D';
  language?: 'en' | 'hi';
}

const SYSTEM_PROMPT = `You are a specialized speech intent classifier for the Exam Saarthi accessibility examination platform.
Classify the candidate's spoken command (in English, Hindi, or Hinglish) into exactly one canonical intent:

CANONICAL INTENTS:
- NAVIGATE_DASHBOARD: Wants to go home, dashboard, main screen, overview ("take me home", "main screen par chalo", "wapas dashboard jao").
- NAVIGATE_PRACTICE: Wants to go to practice module, practice sets, questions bank ("open practice questions", "abhyas shuru karo", "practice mode me jao").
- NAVIGATE_EXAMS: Wants to take mock exams, exams hub, mock test list ("show all mock exams", "pariksha portal kholo", "test series dikhao").
- NAVIGATE_RESULTS: Wants to see results, marks, scorecard, past performance ("check my marks", "meraa result kaisa raha", "show scorecard", "parinaam dikhao").
- NAVIGATE_SETTINGS: Wants to open settings, preferences, font size, voice controls ("open accessibility options", "audio settings badlo", "settings kholo").
- NAVIGATE_BACK: Wants to go to the previous screen or navigate back ("take me back", "pichli screen par jao", "go back", "wapas jao").
- START_EXAM: Wants to start, begin, or launch a mock exam/test ("let's begin the exam", "test shuru karein", "launch test now").
- START_PRACTICE: Wants to launch practice mode ("start practicing now", "abhyas shuru karo").
- DESCRIBE_DIAGRAM: Wants AI to inspect, describe, or explain the question diagram/image ("what is in the figure", "diagram samjhao", "describe the image", "chitra ka vivaran do").
- NEXT_QUESTION: Wants next question ("move to next", "agla sawal", "next question please").
- PREVIOUS_QUESTION: Wants previous question ("pichla sawal", "go to previous question").
- CLEAR_RESPONSE: Wants to clear selected answer ("uncheck my answer", "uttar hata do", "clear selected option").
- SELECT_OPTION: Wants to pick option A, B, C, or D ("mark option b", "vikalp c chuno", "choose d").
- SUBMIT_EXAM: Wants to submit the exam ("finish my test", "pariksha submit karo", "i want to submit").
- SWITCH_TO_ENGLISH: Switch speech language to English ("switch to english", "angrezi chuno").
- SWITCH_TO_HINDI: Switch speech language to Hindi ("hindi mein bolo", "hindi bhasha chuno").
- UNKNOWN: Incoherent, conversational chatter, or unrecognized intent.

Output strictly valid JSON matching this schema:
{
  "intent": string,
  "confidence": number between 0 and 1,
  "optionLetter": optional "A" | "B" | "C" | "D",
  "language": "en" | "hi"
}`;

export async function POST(req: NextRequest) {
  try {
    const { transcript, language = 'en' } = await req.json();

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json(
        { intent: 'UNKNOWN', confidence: 0 },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { intent: 'UNKNOWN', confidence: 0, reason: 'GEMINI_API_KEY_UNSET' },
        { status: 200 }
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200); // Strict low latency timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [
                {
                  text: `User transcript: "${transcript}"\nCandidate locale: ${language}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
            responseMimeType: 'application/json',
          },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { intent: 'UNKNOWN', confidence: 0 },
          { status: 200 }
        );
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return NextResponse.json({ intent: 'UNKNOWN', confidence: 0 });
      }

      const parsed: IntentResponse = JSON.parse(rawText);
      const canonicalIntent = VALID_INTENTS.includes(parsed.intent)
        ? parsed.intent
        : 'UNKNOWN';

      return NextResponse.json({
        intent: canonicalIntent,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
        optionLetter: parsed.optionLetter,
        language: parsed.language || (language === 'hi' ? 'hi' : 'en'),
      });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ intent: 'UNKNOWN', confidence: 0 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { intent: 'UNKNOWN', confidence: 0, error: err?.message },
      { status: 200 }
    );
  }
}
