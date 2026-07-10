import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'your-secret-key';

export function signToken(payload: any, expiresIn = '24h') {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string) {
  return jwt.decode(token);
}
