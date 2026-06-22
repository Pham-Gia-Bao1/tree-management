import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AuthUser, RoleCode } from '@/types/auth.types';

type UserRoleRelation = {
    role?: { id: string; code: string; name: string } | null;
};

type UserResponse = {
    id: string;
    email: string;
    full_name: string;
    status: string;
    branch_id: string | null;
    user_roles: UserRoleRelation[];
};

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('access_token')?.value;

        if (!token) {
            return apiFailure('Unauthorized', 401);
        }

        const payload = verifyToken(token);
        const admin = getSupabaseAdminClient();

        const { data, error } = await admin
            .from('users')
            .select(`
                id, email, full_name, status, branch_id,
                user_roles ( role:roles ( id, code, name ) )
            `)
            .eq('id', payload.userId)
            .single();

        if (error || !data) {
            return apiFailure('Unauthorized', 401);
        }

        const user = data as unknown as UserResponse;

        const roles: RoleCode[] = (user.user_roles ?? [])
            .map((item) => item.role?.code)
            .filter((code): code is RoleCode =>
                code === 'ADMIN' || code === 'MENTOR' || code === 'MEMBER',
            );

        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            roles,
            branchId: user.branch_id,
        };

        return apiSuccess(authUser);
    } catch (error) {
        console.error('AUTH_ME_ERROR', error);
        return apiFailure('Unauthorized', 401);
    }
}
