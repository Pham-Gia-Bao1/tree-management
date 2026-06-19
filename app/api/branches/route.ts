import { NextRequest } from 'next/server';

import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { BranchInput, BranchRecord } from '@/types/branch.types';

function mapBranch(row: { id: string; code: string; name: string; city: string; is_active: boolean }, counts: { members: number; mentors: number; trainings: number }): BranchRecord {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        city: row.city,
        isActive: row.is_active,
        members: counts.members,
        mentors: counts.mentors,
        trainings: counts.trainings,
    };
}

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }

    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return apiFailure(message, 500, error);
}

async function buildBranchCounts(admin: ReturnType<typeof getSupabaseAdminClient>, branchId: string) {
    const [{ count: membersCount }, usersResult] = await Promise.all([
        admin.from('users').select('*', { count: 'exact', head: true }).eq('branch_id', branchId),
        admin.from('users').select('id').eq('branch_id', branchId),
    ]);

    const userIds = (usersResult.data ?? []).map((user) => user.id);
    const mentorIds = userIds.length
        ? (await admin.from('training_links').select('mentor_id').in('mentor_id', userIds)).data ?? []
        : [];
    const trainings = userIds.length
        ? (await admin.from('training_links').select('*', { count: 'exact', head: true }).in('mentor_id', userIds)).count ?? 0
        : 0;

    return {
        members: membersCount ?? 0,
        mentors: mentorIds.length,
        trainings,
    };
}

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();

        const url = new URL(request.url);

        const search =
            url.searchParams
                .get('search')
                ?.trim()
                .toLowerCase() ?? '';

        const isActive =
            url.searchParams.get('isActive');

        let query = admin
            .from('branches')
            .select('*')
            .order('name');

        if (isActive !== null) {
            query = query.eq(
                'is_active',
                isActive === 'true'
            );
        }

        const { data, error } =
            await query;

        if (error) {
            throw error;
        }

        const filtered =
            (data ?? []).filter((branch) => {
                if (!search) {
                    return true;
                }

                return [
                    branch.name,
                    branch.city,
                ]
                    .filter(Boolean)
                    .some((value) =>
                        String(value)
                            .toLowerCase()
                            .includes(search)
                    );
            });

        const mapped =
            await Promise.all(
                filtered.map(
                    async (branch) =>
                        mapBranch(
                            branch,
                            await buildBranchCounts(
                                admin,
                                branch.id
                            )
                        )
                )
            );

        return apiSuccess(mapped);
    } catch (error) {
        return handleError(error);
    }
}

function deriveBranchCode(name: string): string {
    const initials = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip Vietnamese diacritics
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
    return (initials || 'BR').slice(0, 10);
}

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const body = await readJsonBody<Partial<BranchInput>>(request);

        const name = requireString(body.name, 'name');
        const payload = {
            code: (body.code?.trim() || deriveBranchCode(name)).toUpperCase(),
            name,
            city: requireString(body.city, 'city'),
            is_active: body.isActive ?? true,
        };

        const { data, error } = await admin
            .from('branches')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return apiSuccess(mapBranch(data, { members: 0, mentors: 0, trainings: 0 }), 201);
    } catch (error) {
        return handleError(error);
    }
}
