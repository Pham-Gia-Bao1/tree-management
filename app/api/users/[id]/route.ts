import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { optionalString, readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserInput, UserRecord } from '@/types/user.types';
import type { RoleCode } from '@/types/auth.types';
import type { UserStatus } from '@/types/database.types';

const userStatuses = new Set<UserStatus>(['active', 'inactive', 'pending']);

function mapUser(row: any, branchName?: string | null): UserRecord {
    const roles = (row.user_roles ?? [])
        .map((ur: any) => ur.role?.code)
        .filter((c: any): c is RoleCode => Boolean(c));
    return {
        id: row.id,
        name: row.full_name,
        birthDate: row.birth_date,
        branchId: row.branch_id,
        branchName: branchName ?? null,
        email: row.email,
        roles,
        status: row.status,
        avatar: row.avatar_url,
        phone: row.phone,
    };
}

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

async function loadBranchNames(admin: ReturnType<typeof getSupabaseAdminClient>) {
    const { data, error } = await admin.from('branches').select('id, name');
    if (error) throw error;
    return new Map((data ?? []).map((b) => [b.id, b.name]));
}

const SELECT_USER = '*, user_roles ( role:roles ( id, code, name ) )';

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;
        const admin = getSupabaseAdminClient();
        const branchNames = await loadBranchNames(admin);

        const { data, error } = await admin
            .from('users').select(SELECT_USER).eq('id', requireString(id, 'id')).single();
        if (error) throw error;

        return apiSuccess(mapUser(data, data.branch_id ? branchNames.get(data.branch_id) ?? null : null));
    } catch (error) { return handleError(error); }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;
        const admin = getSupabaseAdminClient();
        const body = await readJsonBody<Partial<UserInput>>(request);

        const payload: Record<string, unknown> = {};
        if (body.name !== undefined) payload.full_name = requireString(body.name, 'name');
        if (body.birthDate !== undefined) payload.birth_date = body.birthDate;
        if (body.branchId !== undefined) payload.branch_id = body.branchId;
        if (body.email !== undefined) payload.email = requireString(body.email, 'email');
        if (body.passwordHash !== undefined) payload.password_hash = body.passwordHash;
        if (body.status !== undefined) {
            if (!userStatuses.has(body.status as UserStatus))
                throw new ApiError('Invalid user status.', 400);
            payload.status = body.status;
        }
        const avatar = optionalString(body.avatar);
        const phone = optionalString(body.phone);
        if (avatar !== undefined) payload.avatar_url = avatar;
        if (phone !== undefined) payload.phone = phone;

        if (Object.keys(payload).length === 0 && !body.roles)
            throw new ApiError('No update fields were provided.', 400);

        if (Object.keys(payload).length > 0) {
            const { error } = await admin.from('users').update(payload).eq('id', requireString(id, 'id'));
            if (error) throw error;
        }

        // Update roles nếu được gửi
        if (body.roles !== undefined) {
            await admin.from('user_roles').delete().eq('user_id', id);
            if (body.roles.length > 0) {
                const { data: roleRows } = await admin
                    .from('roles').select('id, code').in('code', body.roles);
                if (roleRows?.length) {
                    await admin.from('user_roles').insert(
                        roleRows.map((r) => ({ user_id: id, role_id: r.id })),
                    );
                }
            }
        }

        const { data, error } = await admin
            .from('users').select(SELECT_USER).eq('id', requireString(id, 'id')).single();
        if (error) throw error;

        const branchNames = await loadBranchNames(admin);
        return apiSuccess(mapUser(data, data.branch_id ? branchNames.get(data.branch_id) ?? null : null));
    } catch (error) { return handleError(error); }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;
        const admin = getSupabaseAdminClient();
        const { error } = await admin.from('users').delete().eq('id', requireString(id, 'id'));
        if (error) throw error;
        return apiSuccess({ deleted: true });
    } catch (error) { return handleError(error); }
}
