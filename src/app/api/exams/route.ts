import { NextResponse } from 'next/server';
import { AvailableExams } from '@/lib/mockData';

// Expose Exam-body REST API with API keys
export async function GET(request: Request) {
  // Simple API key validation
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  const providedKey = authHeader?.replace('Bearer ', '') || apiKeyHeader;
  
  // In a real app, validate against a DB of API keys.
  // For demo purposes, we accept a hardcoded key "EXAMSARTHI_DEMO_KEY"
  if (!providedKey || providedKey !== 'EXAMSARTHI_DEMO_KEY') {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing API key' },
      { status: 401 }
    );
  }

  // Return the sanitized list of exams (without exposing internal logic/answers if applicable)
  return NextResponse.json({
    success: true,
    data: AvailableExams,
  });
}
