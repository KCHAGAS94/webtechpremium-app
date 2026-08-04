import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: auth }, { status: 200 });
}
