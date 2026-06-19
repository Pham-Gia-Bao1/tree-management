// lib/auth/jwt.ts
import jwt from 'jsonwebtoken';
import type { UserRoleCode } from '@/types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET!;

// users.role is a single enum value per the DB migration schema.
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRoleCode;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
