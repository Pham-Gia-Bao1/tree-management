import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { MentorRequestStatus } from '@/types/database.types';

type RouteContext = {
    params: Promise<{ id: string }>;
};

function handleError(error: unknown) {
    console.error('[mentor_requests/[id] error]', error);
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }
    return apiFailure(
        error instanceof Error ? error.message : 'Unexpected error.',
        500,
        error,
    );
}

const SELECT = `
    id,
    requester_id,
    reason,
    experience,
    notes,
    review_note,
    status,
    reviewed_at,
    created_at,
    updated_at,

    requester:users!mentor_requests_requester_id_fkey (
        id,
        full_name,
        email,
        branch_id,
        branches:branches (
            id,
            name,
            city
        )
    ),

    reviewer:users!mentor_requests_reviewed_by_fkey (
        id,
        full_name,
        email
    )
`;

function mapRequest(row: Record<string, unknown>) {
    if (!row) return null;
    const requester = row.requester as Record<string, unknown> | null;
    const reviewer = row.reviewer as Record<string, unknown> | null;
    const branch = requester?.branches as Record<string, unknown> | null;

    return {
        id: row.id as string,
        status: row.status as MentorRequestStatus,
        reason: (row.reason as string | null) ?? null,
        experience: (row.experience as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        reviewNote: (row.review_note as string | null) ?? null,
        createdAt: row.created_at as string,
        updatedAt: (row.updated_at as string | null) ?? null,
        reviewedAt: (row.reviewed_at as string | null) ?? null,
        requester: requester
            ? {
                  id: requester.id as string,
                  name: requester.full_name as string,
                  email: requester.email as string,
                  branch: branch
                      ? {
                            id: branch.id as string,
                            name: branch.name as string,
                            city: branch.city as string,
                        }
                      : null,
              }
            : null,
        reviewedBy: reviewer
            ? {
                  id: reviewer.id as string,
                  name: reviewer.full_name as string,
                  email: reviewer.email as string,
              }
            : null,
    };
}

/* =====================================================
   GET /api/mentor-requests/[id] — Admin only
===================================================== */
export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();

        const { data, error } = await admin
            .from('mentor_requests')
            .select(SELECT)
            .eq('id', id)
            .maybeSingle();

        if (error) throw new ApiError(error.message, 500, error);
        if (!data) throw new ApiError('Mentor request not found.', 404);

        return apiSuccess(mapRequest(data as unknown as Record<string, unknown>));
    } catch (error) {
        return handleError(error);
    }
}

/* =====================================================
   DELETE /api/mentor-requests/[id] — Admin only
===================================================== */
export async function DELETE(_req: NextRequest, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();

        const { error } = await admin
            .from('mentor_requests')
            .delete()
            .eq('id', id);

        if (error) throw new ApiError(error.message, 500, error);

        return apiSuccess({ deleted: true });
    } catch (error) {
        return handleError(error);
    }
}
