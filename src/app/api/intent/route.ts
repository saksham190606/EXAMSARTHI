import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ intent: 'UNKNOWN', target: '' }, { status: 400 });
    }

    const prompt = `You are the navigation AI for "Exam Saarthi", an accessibility platform. 
    Analyze the user's speech (English or Hindi) and return ONLY a JSON object with 'intent' and 'target'. 
    
    INTENTS: 
    - NAVIGATE: user wants to go to a page (targets: '/dashboard', '/exam', '/practice', '/settings')
    - EXAM_LAUNCH: user wants to start a test (targets: 'ssc-cgl', 'upsc-cse', 'ibps-po', 'rrb-ntpc', 'vision-ai', 'gk-geography')
    - CONTROL: user is taking a test (targets: 'NEXT', 'PREVIOUS', 'PAUSE', 'RESUME', 'REPEAT', 'SUBMIT')
    - ANSWER: user is answering a question (targets: 'A', 'B', 'C', 'D', 'TRUE', 'FALSE', or the raw text for fill-in-blanks)
    - UNKNOWN: cannot determine.
    
    Example 1: "take me to the dashboard" -> {"intent": "NAVIGATE", "target": "/dashboard"}
    Example 2: "start ssc cgl mock" -> {"intent": "EXAM_LAUNCH", "target": "ssc-cgl"}
    Example 3: "agla prashn" -> {"intent": "CONTROL", "target": "NEXT"}
    Example 4: "option b" -> {"intent": "ANSWER", "target": "B"}
    
    User speech: "${transcript}"`;

    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0,
      });
    } catch {
      chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: 'llama3-8b-8192',
        response_format: { type: 'json_object' },
        temperature: 0,
      });
    }

    const response = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ intent: 'UNKNOWN', target: '' }, { status: 500 });
  }
}
