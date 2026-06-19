// app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { comparePassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import type { UserRoleCode } from '@/types/auth.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;
    const password = body.password;

    const admin = getSupabaseAdminClient();

    // users.role is the enum column from migration: 'ADMIN' | 'MEMBER' | 'PRE_REGISTERED_MENTOR'
    const { data: user, error } = await admin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return apiFailure('Invalid email or password', 401);
    }

    // PRE_REGISTERED_MENTOR accounts have no password set; block login
    if (user.role === 'PRE_REGISTERED_MENTOR') {
      return apiFailure(
        'Your account has not been activated yet. Please complete registration.',
        403
      );
    }

    const validPassword = await comparePassword(
      password,
      user.password_hash
    );
    if (!validPassword) {
      return apiFailure('Invalid email or password', 401);
    }

    if (user.status !== 'active') {
      return apiFailure(
        'Your account has not been approved yet.',
        403
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRoleCode,
    });

    const cookieStore = await cookies();
    cookieStore.set('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return apiSuccess({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    return apiFailure(
      error instanceof Error ? error.message : 'Unexpected error',
      500
    );
  }
}
