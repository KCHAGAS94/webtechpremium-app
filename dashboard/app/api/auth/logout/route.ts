import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout realizado com sucesso' });
  response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
  return response;
}
