import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { score, total, correctTopics, weakTopics } = await req.json();

    const prompt = `You are "Exam Saarthi", an encouraging, accessible AI tutor for visually impaired students. 
    The student just finished an exam. They scored ${score} out of ${total}. 
    Their strong areas: ${correctTopics}. Their weak areas: ${weakTopics}.
    
    Write a very short, conversational, encouraging summary (maximum 3 sentences). 
    End with exactly this sentence: "When you are ready, say 'Review' to begin reviewing your questions one by one."
    Do not use emojis, asterisks, or markdown. Use plain spoken text.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
    });

    return NextResponse.json({ summary: chatCompletion.choices[0]?.message?.content });
  } catch (error) {
    return NextResponse.json({ summary: "Exam complete. Say 'Review' to review your answers." });
  }
}
