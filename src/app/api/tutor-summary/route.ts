import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function POST(req: Request) {
  console.log("[BACKEND DIAGNOSTIC] API Route Hit. GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ summary: "Unauthorized" }, { status: 401 });
    }
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return NextResponse.json({ summary: "Unauthorized" }, { status: 401 });
    }

    const { score, total, correctTopics, weakTopics } = await req.json();

    const prompt = `You are "Exam Saarthi", an encouraging, accessible AI tutor for visually impaired students. 
    The student just finished an exam. They scored ${score} out of ${total}. 
    Their strong areas: ${correctTopics}. Their weak areas: ${weakTopics}.
    
    Write a very short, conversational, encouraging summary (maximum 3 sentences). 
    End with exactly this sentence: "When you are ready, say 'Review' to begin reviewing your questions one by one."
    Do not use emojis, asterisks, or markdown. Use plain spoken text.`;

    const { data, response } = await groq.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
    }).withResponse();

    console.log("[BACKEND DIAGNOSTIC] Groq API response status:", response.status);
    console.log("[BACKEND DIAGNOSTIC] Summary successfully generated. Preview:", data.choices[0]?.message?.content?.substring(0, 50) + "...");

    return NextResponse.json({ summary: data.choices[0]?.message?.content });
  } catch (error) {
    console.error("[BACKEND DIAGNOSTIC] Fatal API Error:", error);
    return NextResponse.json({ summary: "Exam complete. Say 'Review' to review your answers." });
  }
}
