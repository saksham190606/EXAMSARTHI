import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AI_CONFIG, getGroqClient } from '@/lib/ai/config';

export const runtime = 'nodejs';

// Graceful fallback text used when Groq is unavailable.
const FALLBACK_SUMMARY = 'Exam complete. Review your answers.';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ summary: FALLBACK_SUMMARY });
    }
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return NextResponse.json({ summary: FALLBACK_SUMMARY });
    }

    let body: { score?: number; total?: number; correctTopics?: string; weakTopics?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ summary: FALLBACK_SUMMARY });
    }

    const { score, total, correctTopics, weakTopics } = body;

    const groq = getGroqClient();
    if (!groq) {
      console.warn('[/api/tutor-summary] GROQ_API_KEY is not set. Returning fallback summary.');
      return NextResponse.json({ summary: FALLBACK_SUMMARY });
    }

    const prompt = `You are "Exam Saarthi", an encouraging, accessible AI tutor for visually impaired students.
The student just finished an exam. They scored ${score} out of ${total}.
Their strong areas: ${correctTopics}. Their weak areas: ${weakTopics}.

Write a very short, conversational, encouraging summary (maximum 3 sentences).
End with exactly this sentence: "Exam complete. Review your answers."
Do not use emojis, asterisks, or markdown. Use plain spoken text.`;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: AI_CONFIG.TUTOR_MODEL,
        temperature: 0.7,
      });

      const summary = chatCompletion.choices[0]?.message?.content;
      return NextResponse.json({ summary: summary || FALLBACK_SUMMARY });
    } catch (groqError: unknown) {
      console.error(
        '[/api/tutor-summary] Groq API call failed:',
        groqError instanceof Error ? groqError.message : String(groqError)
      );
      return NextResponse.json({ summary: FALLBACK_SUMMARY });
    }
  } catch (error: unknown) {
    console.error(
      '[/api/tutor-summary] Unexpected error:',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ summary: FALLBACK_SUMMARY });
  }
}
