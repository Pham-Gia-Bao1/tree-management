import jwt from 'jsonwebtoken';
import type { RoleCode } from '@/types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET!;

// roles là mảng vì 1 user có thể có nhiều role (RBAC qua user_roles)
export interface JwtPayload {
    userId: string;
    email: string;
    roles: RoleCode[];
}

export function signToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
