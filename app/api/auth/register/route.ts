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
ENDOFFILE

cat > /home/claude/tree-v3/app/api/auth/register/route.ts << 'ENDOFFILE'
// app/api/auth/register/route.ts
import bcrypt from 'bcryptjs';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const DEFAULT_ROLE_CODE = 'MEMBER';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, fullName, birthDate, branchId, phone } = body;

        if (!email) return apiFailure('Email is required', 400);
        if (!password) return apiFailure('Password is required', 400);
        if (!fullName) return apiFailure('Full name is required', 400);

        const admin = getSupabaseAdminClient();

        const { data: existingUser } = await admin
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (existingUser) return apiFailure('Email already exists', 400);

        // Lookup MEMBER role từ bảng roles
        const { data: memberRole, error: roleError } = await admin
            .from('roles')
            .select('id, code')
            .eq('code', DEFAULT_ROLE_CODE)
            .single();

        if (roleError || !memberRole) {
            throw new Error('Default member role is not configured');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user (không có cột role)
        const { data, error } = await admin
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                full_name: fullName,
                birth_date: birthDate || null,
                branch_id: branchId || null,
                phone: phone || null,
                status: 'pending',
            })
            .select('id, email, full_name, status')
            .single();

        if (error) throw error;

        // Link user với role MEMBER qua user_roles
        const { error: userRoleError } = await admin
            .from('user_roles')
            .insert({ user_id: data.id, role_id: memberRole.id });

        if (userRoleError) {
            // Cleanup nếu link role thất bại
            await admin.from('users').delete().eq('id', data.id);
            throw userRoleError;
        }

        return apiSuccess(
            {
                id: data.id,
                email: data.email,
                fullName: data.full_name,
                roles: [memberRole.code],
                status: data.status,
            },
            201,
        );
    } catch (error) {
        console.error(error);
        return apiFailure(
            error instanceof Error ? error.message : 'Unexpected error',
            500,
        );
    }
}
