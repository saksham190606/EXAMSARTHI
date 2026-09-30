import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Demo session active' });
  response.cookies.set('examsarthi_demo_auth', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Demo session cleared' });
  response.cookies.set('examsarthi_demo_auth', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
  return response;
}
