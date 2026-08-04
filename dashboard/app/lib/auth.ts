import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

export type AuthPayload = {
  id: number;
  email: string;
  role: 'ADMIN' | 'REVENDA';
};

export function getAuthUser(request: NextRequest): AuthPayload | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || typeof payload !== 'object') return null;

  return payload as AuthPayload;
}
