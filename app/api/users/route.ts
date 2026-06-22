import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { optionalString, readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserInput, UserRecord } from '@/types/user.types';
import type { RoleCode } from '@/types/auth.types';
import type { UserStatus } from '@/types/database.types';

const userStatuses = new Set<UserStatus>(['active', 'inactive', 'pending']);

function mapUser(
    row: {
        id: string; email: string; password_hash: string; full_name: string;
        birth_date: string | null; branch_id: string | null;
        status: UserStatus; avatar_url: string | null; phone: string | null;
        user_roles?: { role: { code: string } | null }[];
    },
    branchName?: string | null,
): UserRecord {
    const roles = (row.user_roles ?? [])
        .map((ur) => ur.role?.code)
        .filter((c): c is RoleCode => Boolean(c));
    return {
        id: row.id,
        fullName: row.full_name,
        birthDate: row.birth_date,
        branchId: row.branch_id,
        branchName: branchName ?? null,
        email: row.email,
        roles,
        status: row.status,
        avatarUrl: row.avatar_url,
        phone: row.phone,
    };
}

function normalizeStatus(value: unknown, fallback: UserStatus = 'active'): UserStatus {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string' || !userStatuses.has(value as UserStatus))
        throw new ApiError('Invalid user status.', 400);
    return value as UserStatus;
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

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const url = new URL(request.url);
        const search = url.searchParams.get('search')?.trim().toLowerCase() ?? '';
        const branchId = url.searchParams.get('branchId');
        const roleFilter = url.searchParams.get('role');
        const status = url.searchParams.get('status');

        if (status && !userStatuses.has(status as UserStatus))
            throw new ApiError('Invalid status filter.', 400);

        const [usersResult, branchNames] = await Promise.all([
            admin.from('users').select(`
                *, user_roles ( role:roles ( id, code, name ) )
            `).order('full_name', { ascending: true }),
            loadBranchNames(admin),
        ]);

        if (usersResult.error) throw usersResult.error;

        const filtered = (usersResult.data ?? []).filter((user) => {
            const userRoles = (user.user_roles ?? [])
                .map((ur: any) => ur.role?.code)
                .filter(Boolean) as string[];

            if (branchId && user.branch_id !== branchId) return false;
            if (roleFilter && !userRoles.includes(roleFilter)) return false;
            if (status && user.status !== status) return false;
            if (!search) return true;

            const branchName = user.branch_id ? branchNames.get(user.branch_id) ?? '' : '';
            return [user.full_name, user.email, user.status, branchName, ...userRoles]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(search));
        });

        return apiSuccess(filtered.map((user) =>
            mapUser(user as any, user.branch_id ? branchNames.get(user.branch_id) ?? null : null),
        ));
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const body = await readJsonBody<Partial<UserInput>>(request);

        const payload = {
            email: requireString(body.email, 'email'),
            password_hash: body.passwordHash ?? 'seeded',
            full_name: requireString(body.fullName, 'fullName'),
            birth_date: body.birthDate ?? null,
            branch_id: body.branchId ?? null,
            status: normalizeStatus(body.status),
            avatar_url: optionalString(body.avatarUrl),
            phone: optionalString(body.phone),
        };

        const { data, error } = await admin
            .from('users')
            .insert(payload)
            .select('*, user_roles ( role:roles ( id, code, name ) )')
            .single();

        if (error) throw error;

        // Assign default MEMBER role nếu có roles trong input
        if (body.roles?.length) {
            const roleCodes = body.roles;
            const { data: roleRows } = await admin
                .from('roles')
                .select('id, code')
                .in('code', roleCodes);
            if (roleRows?.length) {
                await admin.from('user_roles').insert(
                    roleRows.map((r) => ({ user_id: data.id, role_id: r.id })),
                );
            }
        } else {
            // Default: MEMBER
            const { data: memberRole } = await admin
                .from('roles').select('id').eq('code', 'MEMBER').single();
            if (memberRole) {
                await admin.from('user_roles').insert({ user_id: data.id, role_id: memberRole.id });
            }
        }

        // Re-fetch để có roles
        const { data: final } = await admin
            .from('users')
            .select('*, user_roles ( role:roles ( id, code, name ) )')
            .eq('id', data.id)
            .single();

        const branchNames = await loadBranchNames(admin);
        return apiSuccess(
            mapUser(final as any, final?.branch_id ? branchNames.get(final.branch_id) ?? null : null),
            201,
        );
    } catch (error) {
        return handleError(error);
    }
}
