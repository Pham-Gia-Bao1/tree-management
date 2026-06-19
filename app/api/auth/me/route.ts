import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AuthUser, RoleCode } from '@/types/auth.types';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('access_token')?.value;

        if (!token) return apiFailure('Unauthorized', 401);

        const payload = verifyToken(token);
        const admin = getSupabaseAdminClient();

        const { data: user } = await admin
            .from('users')
            .select(`
                id, email, full_name, status, branch_id,
                user_roles ( role:roles ( id, code, name ) )
            `)
            .eq('id', payload.userId)
            .single();

        if (!user) return apiFailure('Unauthorized', 401);

        const roles = (user.user_roles ?? [])
            .map((ur: any) => ur.role?.code)
            .filter((code: any): code is RoleCode => Boolean(code));

        const response: AuthUser = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            roles,
            branchId: user.branch_id,
        };

        return apiSuccess(response);
    } catch {
        return apiFailure('Unauthorized', 401);
    }
}
