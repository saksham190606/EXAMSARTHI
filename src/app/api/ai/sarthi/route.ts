import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { isExamRoute } from '@/lib/assistant/sarthiExamLock';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// We initialize Groq here. It will pick up GROQ_API_KEY from the environment automatically.
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

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

    const body = await req.json();
    const { transcript, language, currentUrl, examContext } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
    }

    const limitedTranscript = transcript.substring(0, 300);

    // Server-side safety check: Sarthi is strictly disabled during active exams
    if (isExamRoute(currentUrl)) {
      return NextResponse.json({ error: 'Sarthi is disabled during active exams.' }, { status: 403 });
    }

    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is missing. AI will not function correctly.');
      // Provide a fallback graceful failure
      return NextResponse.json(
        {
          action: 'GENERAL_RESPONSE',
          spokenResponse: language === 'hi'
            ? 'क्षमा करें, मेरा एआई ब्रेन अभी चालू नहीं है। कृपया GROQ API KEY सेट करें।'
            : 'Sorry, my AI brain is currently disconnected. Please configure the GROQ API KEY.',
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
- "payload" is optional and depends on the action.
- If the user asks if they are improving, or asks about their performance trend, return {"action": "GET_PERFORMANCE_TREND"}.
- If the user asks why their score is low or why they are losing marks, return {"action": "DIAGNOSE_SCORE"}.
- If the user asks what topics they are weak in, or asks which topics in a subject (e.g. Mathematics, English, Reasoning) they are weak in, return {"action": "WHAT_ARE_MY_WEAK_TOPICS", "payload": { "subject": "Mathematics" (if specified) }}.
- If the user asks for a target score or improvement goal, return {"action": "SET_GOAL_GUIDANCE", "payload": { "subject": "Mathematics" (if specified) }}.
- If the user asks what they should focus on this week or what to prioritize this week, return {"action": "GET_WEEKLY_FOCUS"}.
- If the user asks to create or generate a study plan, return {"action": "GENERATE_STUDY_PLAN"}.
- If the user asks for their weak areas, return {"action": "WHAT_ARE_MY_WEAK_AREAS"}.
- If the user asks what they should practice or study, return {"action": "WHAT_SHOULD_I_PRACTICE"}.
- If the user asks to start practice, return {"action": "START_PRACTICE"}. If they specify a subject, include it in the payload.
- If the user asks how to improve, return {"action": "HOW_SHOULD_I_IMPROVE"}.
- If the user asks how they are performing, return {"action": "GET_PERFORMANCE_SUMMARY"}.
- If the user asks how much time is left in the exam, return {"action": "GET_EXAM_TIME_REMAINING"}.
- If the user asks how they are doing in the current exam, return {"action": "GET_CURRENT_EXAM_PERFORMANCE"}.
- If the user asks what you can do, return {"action": "HELP_CAPABILITIES"}.
- If the user asks "What can I do here?", use GENERAL_RESPONSE to explain relevant actions for their currentUrl.
- If the user says "Close Sarthi" or "Thank you", return {"action": "CLOSE_SARTHI", "spokenResponse": "You're welcome. Closing Sarthi now."}.
- If the user asks to start an exam, return {"action": "START_EXAM"}.

Example 1:
User: "Make the text bigger please"
{
  "action": "SET_FONT_SIZE",
  "payload": { "size": "large" },
  "spokenResponse": "${language === 'hi' ? 'मैंने अक्षर बड़े कर दिए हैं।' : 'I have increased the text size.'}"
}

Example 2:
User: "What is the question?"
{
  "action": "READ_QUESTION",
  "spokenResponse": "${language === 'hi' ? 'मैं सवाल पढ़ रही हूँ।' : 'I will read the question now.'}"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User's Request: ${JSON.stringify(limitedTranscript)}` }
      ],
      model: 'openai/gpt-oss-120b', // Fast model suitable for JSON and quick responses
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const aiResponseText = chatCompletion.choices[0]?.message?.content;

    if (!aiResponseText) {
      throw new Error('Empty response from Groq');
    }

    let parsedAction;
    try {
      parsedAction = JSON.parse(aiResponseText);
    } catch {
      console.error('Failed to parse JSON from Groq:', aiResponseText);
      return NextResponse.json({ error: 'Invalid JSON returned from AI' }, { status: 500 });
    }

    return NextResponse.json(parsedAction);
  } catch (error: unknown) {
    console.error('Error in Sarthi AI endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
