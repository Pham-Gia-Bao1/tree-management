import { NextRequest } from 'next/server';

import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { optionalString, readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserInput, UserRecord } from '@/types/user.types';
import type { UserRole, UserStatus } from '@/types/database.types';

const userRoles = new Set<UserRole>(['ADMIN', 'MEMBER', 'PRE_REGISTERED_MENTOR']);
const userStatuses = new Set<UserStatus>(['active', 'inactive', 'pending']);

function mapUser(row: {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    birth_date: string | null;
    branch_id: string | null;
    role: UserRole;
    status: UserStatus;
    avatar_url: string | null;
    phone: string | null;
}, branchName?: string | null): UserRecord {
    return {
        id: row.id,
        name: row.full_name,
        birthDate: row.birth_date,
        branchId: row.branch_id,
        branchName: branchName ?? null,
        email: row.email,
        role: row.role,
        status: row.status,
        avatar: row.avatar_url,
        phone: row.phone,
    };
}

function normalizeRole(value: unknown, fallback: UserRole = 'MEMBER') {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (typeof value !== 'string' || !userRoles.has(value as UserRole)) {
        throw new ApiError('Invalid user role.', 400);
    }

    return value as UserRole;
}

function normalizeStatus(value: unknown, fallback: UserStatus = 'active') {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (typeof value !== 'string' || !userStatuses.has(value as UserStatus)) {
        throw new ApiError('Invalid user status.', 400);
    }

    return value as UserStatus;
}

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }

    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return apiFailure(message, 500, error);
}

async function loadBranchNames(admin: ReturnType<typeof getSupabaseAdminClient>) {
    const { data, error } = await admin.from('branches').select('id, name');

    if (error) {
        throw error;
    }

    return new Map((data ?? []).map((branch) => [branch.id, branch.name]));
}

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const url = new URL(request.url);
        const search = url.searchParams.get('search')?.trim().toLowerCase() ?? '';
        const branchId = url.searchParams.get('branchId');
        const role = url.searchParams.get('role');
        const status = url.searchParams.get('status');

        if (role && !userRoles.has(role as UserRole)) {
            throw new ApiError('Invalid role filter.', 400);
        }

        if (status && !userStatuses.has(status as UserStatus)) {
            throw new ApiError('Invalid status filter.', 400);
        }

        const [usersResult, branchNames] = await Promise.all([
            admin.from('users').select('*').order('full_name', { ascending: true }),
            loadBranchNames(admin),
        ]);

        if (usersResult.error) {
            throw usersResult.error;
        }

        const filtered = (usersResult.data ?? []).filter((user) => {
            if (branchId && user.branch_id !== branchId) {
                return false;
            }

            if (role && user.role !== role) {
                return false;
            }

            if (status && user.status !== status) {
                return false;
            }

            if (!search) {
                return true;
            }

            const branchName = user.branch_id ? branchNames.get(user.branch_id) ?? '' : '';
            return [user.full_name, user.email, user.role, user.status, branchName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search));
        });

        return apiSuccess(filtered.map((user) => mapUser(user, user.branch_id ? branchNames.get(user.branch_id) ?? null : null)));
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
            full_name: requireString(body.name, 'name'),
            birth_date: body.birthDate ?? null,
            branch_id: body.branchId ?? null,
            role: normalizeRole(body.role),
            status: normalizeStatus(body.status),
            avatar_url: optionalString(body.avatar),
            phone: optionalString(body.phone),
        };

        const { data, error } = await admin
            .from('users')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        const branchNames = await loadBranchNames(admin);
        return apiSuccess(mapUser(data, data.branch_id ? branchNames.get(data.branch_id) ?? null : null), 201);
    } catch (error) {
        return handleError(error);
    }
}