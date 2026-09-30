import { NextRequest, NextResponse } from 'next/server';
import { isExamRoute } from '@/lib/assistant/sarthiExamLock';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AI_CONFIG, getGroqClient } from '@/lib/ai/config';
import { SarthiAction } from '@/lib/assistant/sarthiActions';

// Deterministic local resolver for common voice commands in Sarthi
function resolveSarthiLocally(transcript: string, language: string): SarthiAction | null {
  const t = transcript.toLowerCase().trim();
  const isHi = language === 'hi';

  // Navigation: Exam
  if (
    t === 'exam' ||
    t === 'exams' ||
    t === 'open exam' ||
    t === 'go to exam' ||
    t === 'exam kholo' ||
    t === 'exam shuru' ||
    t === 'exam shuru karo' ||
    /\b(exam|exams|mock|test|परीक्षा|मॉक टेस्ट|टेस्ट)\b/.test(t)
  ) {
    if (t.includes('ssc') || t.includes('cgl')) {
      return {
        action: 'START_EXAM',
        payload: { examId: 'e1' },
        spokenResponse: isHi ? 'एसएससी सीजीएल परीक्षा शुरू की जा रही है।' : 'Starting SSC CGL exam.',
      };
    }
    if (t.includes('upsc') || t.includes('csat')) {
      return {
        action: 'START_EXAM',
        payload: { examId: 'e3' },
        spokenResponse: isHi ? 'यूपीएससी परीक्षा शुरू की जा रही है।' : 'Starting UPSC exam.',
      };
    }
    return {
      action: 'NAVIGATE',
      payload: { path: '/exam' },
      spokenResponse: isHi ? 'परीक्षा केंद्र खोला जा रहा है।' : 'Navigating to the exams hub.',
    };
  }

  // Navigation: Dashboard
  if (/\b(dashboard|home|main screen|डैशबोर्ड|होम|मुख्य पृष्ठ)\b/.test(t)) {
    return {
      action: 'NAVIGATE',
      payload: { path: '/dashboard' },
      spokenResponse: isHi ? 'डैशबोर्ड खोला जा रहा है।' : 'Navigating to your dashboard.',
    };
  }

  // Navigation: Practice
  if (/\b(practice|learn|study|prepare|प्रैक्टिस|अभ्यास|पढ़ाई)\b/.test(t)) {
    return {
      action: 'NAVIGATE',
      payload: { path: '/practice' },
      spokenResponse: isHi ? 'अभ्यास अनुभाग खोला जा रहा है।' : 'Navigating to the practice section.',
    };
  }

  // Navigation: Settings
  if (/\b(settings?|preferences|accessibility|सेटिंग|विकल्प)\b/.test(t)) {
    return {
      action: 'NAVIGATE',
      payload: { path: '/settings' },
      spokenResponse: isHi ? 'सेटिंग्स खोली जा रही हैं।' : 'Navigating to settings.',
    };
  }

  // Navigation: Results
  if (/\b(results?|scores?|स्कोर|रिजल्ट)\b/.test(t)) {
    return {
      action: 'NAVIGATE',
      payload: { path: '/results' },
      spokenResponse: isHi ? 'रिजल्ट पृष्ठ पर जाया जा रहा है।' : 'Navigating to results.',
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { transcript?: string; language?: string; currentUrl?: string; examContext?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { transcript, language = 'en', currentUrl = '/', examContext } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
    }

    const limitedTranscript = transcript.substring(0, 300).trim();

    // Server-side safety check: Sarthi is strictly disabled during active exams
    if (isExamRoute(currentUrl)) {
      return NextResponse.json({ error: 'Sarthi is disabled during active exams.' }, { status: 403 });
    }

    // 1. Try deterministic local resolution first
    const localAction = resolveSarthiLocally(limitedTranscript, language);
    if (localAction) {
      return NextResponse.json(localAction, { status: 200 });
    }

    // 2. Groq AI processing
    const groq = getGroqClient();
    if (!groq) {
      console.warn('[/api/ai/sarthi] GROQ_API_KEY is not set. Returning graceful fallback.');
      return NextResponse.json(
        {
          action: 'GENERAL_RESPONSE',
          spokenResponse: language === 'hi'
            ? 'क्षमा करें, मेरा एआई ब्रेन अभी चालू नहीं है।'
            : 'Sorry, my AI brain is currently disconnected. Please configure the API key.',
        },
        { status: 200 }
      );
    }

    const systemPrompt = `You are "Sarthi", a voice-first AI accessibility co-pilot for visually impaired candidates on the EXAMSARTHI platform.
Your objective is to interpret the user's natural language request and return a structured JSON action.
DO NOT return markdown, markdown code blocks, or conversational text. Return ONLY a valid JSON object.

The user's current URL is: ${currentUrl}
The user prefers language: ${language === 'hi' ? 'Hindi' : 'English'}
${examContext ? `\nThe user is currently taking an exam. Here is the current question context:\n${JSON.stringify(examContext, null, 2)}` : ''}

Whitelisted Actions (action field):
1. NAVIGATE - Navigate to a different page. Payload: { path: '/dashboard' | '/exam' | '/results' | '/settings' | '/practice' }
2. SET_FONT_SIZE - Change text size. Payload: { size: 'default' | 'large' | 'xlarge' }
3. TOGGLE_CONTRAST - Toggle high contrast mode. Payload: { contrast: 'default' | 'high' }
4. START_EXAM - Start an exam. Payload: { examId?: string }
5. READ_QUESTION - Read the current exam question out loud.
6. READ_OPTIONS - Read the options for the current question.
7. NEXT_QUESTION - Go to the next question.
8. PREVIOUS_QUESTION - Go to the previous question.
9. SUBMIT_EXAM - Submit the current exam.
10. WHAT_ARE_MY_WEAK_AREAS - Analyze and read the user's weak subject areas from their past results.
11. WHAT_SHOULD_I_PRACTICE - Recommend what the user should practice based on performance analytics.
12. START_PRACTICE - Navigate the user to the practice area, potentially for a specific subject if recommended. Payload: { subject?: string }
13. HOW_SHOULD_I_IMPROVE - Give actionable study recommendations based on analytics.
14. GET_PERFORMANCE_SUMMARY - Summarize the user's overall accuracy and performance.
15. GET_PERFORMANCE_TREND - Check if candidate's performance is improving, declining, or stable compared to previous tests.
16. DIAGNOSE_SCORE - Diagnose why score is low or why candidate is losing marks based on data (unattempted questions, wrong answers, weak subjects).
17. WHAT_ARE_MY_WEAK_TOPICS - Analyze and report weak topics for a specific subject or overall. Payload: { subject?: string }
18. SET_GOAL_GUIDANCE - Build a goal-based improvement plan for a subject or overall performance. Payload: { subject?: string }
19. GET_WEEKLY_FOCUS - Recommend the top priorities for the upcoming week based on weak areas and recent performance.
20. GENERATE_STUDY_PLAN - Create a practical study plan with time distribution by subject.
21. GET_EXAM_TIME_REMAINING - Tell the user how much time is left in the current active exam.
22. GET_CURRENT_EXAM_PERFORMANCE - Tell the user their accuracy or score so far in the current active exam.
23. CLOSE_SARTHI - Close the Sarthi assistant.
24. HELP_CAPABILITIES - Summarize what Sarthi can do.
25. GENERAL_RESPONSE - Provide a context-aware conversational answer or explain actions available in the current route if asked "What can I do here?".

IMPORTANT RULES:
- You MUST return a JSON object with at least two fields: "action" and "spokenResponse".
- "action" MUST be exactly one of the Whitelisted Actions above.
- "spokenResponse" MUST be a short, natural, conversational response acknowledging the action in the user's preferred language. Do not output raw JSON or Markdown in spokenResponse.
- "payload" is optional and depends on the action.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User's Request: ${JSON.stringify(limitedTranscript)}` },
      ],
      model: AI_CONFIG.SARTHI_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const actionText = chatCompletion.choices[0]?.message?.content || '{}';
    let parsedAction: SarthiAction;
    try {
      parsedAction = JSON.parse(actionText) as SarthiAction;
    } catch {
      parsedAction = {
        action: 'GENERAL_RESPONSE',
        spokenResponse: language === 'hi' ? 'क्षमा करें, मुझे समझ नहीं आया।' : "Sorry, I couldn't understand that.",
      };
    }

    return NextResponse.json(parsedAction);
  } catch (error: unknown) {
    console.error('[/api/ai/sarthi] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        action: 'GENERAL_RESPONSE',
        spokenResponse: 'Sorry, something went wrong. Please try again.',
      },
      { status: 200 }
    );
  }
}
