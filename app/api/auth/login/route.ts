// app/api/auth/me/route.ts
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AuthUser, UserRoleCode } from '@/types/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
      return apiFailure('Unauthorized', 401);
    }

    const payload = verifyToken(token);
    const admin = getSupabaseAdminClient();

    // NOTE: "role" is no longer a column on users. Roles now come through the
    // user_roles -> roles relation, embedded here as role codes/names.
    const { data: user } = await admin
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        status,
        branch_id,
        user_roles (
          role:roles (
            id,
            code,
            name
          )
        )
      `
      )
      .eq('id', payload.userId)
      .single();

    if (!user) {
      return apiFailure('Unauthorized', 401);
    }

    const roleCodes: UserRoleCode[] = (user.user_roles ?? [])
      .map((ur: { role: { code: UserRoleCode } | null }) => ur.role?.code)
      .filter((code): code is UserRoleCode => Boolean(code));

    const response: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      roles: roleCodes,
      branchId: user.branch_id,
    };

    return apiSuccess(response);
  } catch {
    return apiFailure('Unauthorized', 401);
  }
}
