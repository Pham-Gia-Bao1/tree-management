import { NextRequest } from 'next/server';

import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import {
    optionalString,
    readJsonBody,
    requireString,
} from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

import type { UserInput, UserRecord } from '@/types/user.types';
import type { UserRole, UserStatus } from '@/types/database.types';

const userRoles = new Set<UserRole>([
    'ADMIN',
    'MEMBER',
    'PRE_REGISTERED_MENTOR',
]);

const userStatuses = new Set<UserStatus>([
    'active',
    'inactive',
    'pending',
]);

type UserUpdatePayload = {
    full_name?: string;
    birth_date?: string | null;
    branch_id?: string | null;
    email?: string;
    password_hash?: string;
    role?: UserRole;
    status?: UserStatus;
    avatar_url?: string | null;
    phone?: string | null;
};

function mapUser(
    row: {
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
    },
    branchName?: string | null,
): UserRecord {
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

function normalizeRole(value: unknown): UserRole | undefined {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return undefined;
    }

    if (
        typeof value !== 'string' ||
        !userRoles.has(value as UserRole)
    ) {
        throw new ApiError('Invalid user role.', 400);
    }

    return value as UserRole;
}

function normalizeStatus(
    value: unknown,
): UserStatus | undefined {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return undefined;
    }

    if (
        typeof value !== 'string' ||
        !userStatuses.has(value as UserStatus)
    ) {
        throw new ApiError('Invalid user status.', 400);
    }

    return value as UserStatus;
}

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(
            error.message,
            error.status,
            error.details,
        );
    }

    const message =
        error instanceof Error
            ? error.message
            : 'Unexpected error.';

    return apiFailure(message, 500, error);
}

async function loadBranchNames(
    admin: ReturnType<typeof getSupabaseAdminClient>,
) {
    const { data, error } = await admin
        .from('branches')
        .select('id, name');

    if (error) {
        throw error;
    }

    return new Map(
        (data ?? []).map((branch) => [
            branch.id,
            branch.name,
        ]),
    );
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();
        const branchNames = await loadBranchNames(admin);

        const { data, error } = await admin
            .from('users')
            .select('*')
            .eq('id', requireString(id, 'id'))
            .single();

        if (error) {
            throw error;
        }

        return apiSuccess(
            mapUser(
                data,
                data.branch_id
                    ? branchNames.get(data.branch_id) ?? null
                    : null,
            ),
        );
    } catch (error) {
        return handleError(error);
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();

        const body =
            await readJsonBody<Partial<UserInput>>(request);

        const payload: UserUpdatePayload = {};

        if (body.name !== undefined) {
            payload.full_name = requireString(
                body.name,
                'name',
            );
        }

        if (body.birthDate !== undefined) {
            payload.birth_date = body.birthDate;
        }

        if (body.branchId !== undefined) {
            payload.branch_id = body.branchId;
        }

        if (body.email !== undefined) {
            payload.email = requireString(
                body.email,
                'email',
            );
        }

        if (body.passwordHash !== undefined) {
            payload.password_hash = body.passwordHash;
        }

        const role = normalizeRole(body.role);
        const status = normalizeStatus(body.status);
        const avatar = optionalString(body.avatar);
        const phone = optionalString(body.phone);

        if (role !== undefined) {
            payload.role = role;
        }

        if (status !== undefined) {
            payload.status = status;
        }

        if (avatar !== undefined) {
            payload.avatar_url = avatar;
        }

        if (phone !== undefined) {
            payload.phone = phone;
        }

        if (Object.keys(payload).length === 0) {
            throw new ApiError(
                'No update fields were provided.',
                400,
            );
        }

        const { data, error } = await admin
            .from('users')
            .update(payload)
            .eq('id', requireString(id, 'id'))
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        const branchNames =
            await loadBranchNames(admin);

        return apiSuccess(
            mapUser(
                data,
                data.branch_id
                    ? branchNames.get(data.branch_id) ?? null
                    : null,
            ),
        );
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();

        const { error } = await admin
            .from('users')
            .delete()
            .eq('id', requireString(id, 'id'));

        if (error) {
            throw error;
        }

        return apiSuccess({
            deleted: true,
        });
    } catch (error) {
        return handleError(error);
    }
}