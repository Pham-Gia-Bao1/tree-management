// app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { comparePassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import type { UserRoleCode } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;
    const password = body.password;

    const admin = getSupabaseAdminClient();

    // NOTE: "users" no longer has a "role" column. Roles now come from the
    // user_roles -> roles relation (RBAC). We embed that relation so we can
    // read the role codes (e.g. 'ADMIN', 'MENTOR', 'MEMBER') for this user.
    const { data: user, error } = await admin
      .from('users')
      .select(
        `
        *,
        user_roles (
          role:roles (
            id,
            code,
            name
          )
        )
      `
      )
      .eq('email', email)
      .single();

    if (error || !user) {
      return apiFailure('Invalid email or password', 401);
    }

    const roleCodes = (user.user_roles ?? [])
      .map((ur) => ur.role?.code)
      .filter((code): code is string => Boolean(code)) as UserRoleCode[];

    // TODO: the old "PRE_REGISTERED_MENTOR" role no longer exists in the new
    // roles table (seed only defines ADMIN, MENTOR, MEMBER). If there is still
    // a business rule for users who registered via a mentor request but
    // haven't finished onboarding, it needs to be re-modeled (e.g. a dedicated
    // status value, or checking related rows in mentor_requests). For now this
    // specific gate has been removed; the status check below still blocks
    // login for any non-active user, just with a generic message.

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

    // BREAKING CHANGE: token payload now carries "roles" (string[]) instead of
    // a single "role" string. Update lib/auth/jwt.ts (TokenPayload type) and
    // any middleware/code reading payload.role to use payload.roles instead.
    const token = signToken({
      userId: user.id,
      email: user.email,
      roles: roleCodes,
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
        roles: roleCodes,
      },
    });
  } catch (error) {
    return apiFailure(
      error instanceof Error ? error.message : 'Unexpected error',
      500
    );
  }
}
