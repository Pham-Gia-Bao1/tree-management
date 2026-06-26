import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { MentorRequestStatus } from '@/types/database.types';

/* =====================================================
   ERROR HANDLER
===================================================== */
function handleError(error: unknown) {
    console.error('[mentor_requests/my error]', error);
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }
    return apiFailure(
        error instanceof Error ? error.message : 'Unexpected error.',
        500,
        error,
    );
}

/* =====================================================
   SELECT
===================================================== */
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

    reviewer:users!mentor_requests_reviewed_by_fkey (
        id,
        full_name,
        email
    )
`;

/* =====================================================
   MAPPER
===================================================== */
function mapRequest(row: Record<string, unknown>) {
    if (!row) return null;
    const reviewer = row.reviewer as Record<string, unknown> | null;

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
   GET /api/mentor-requests/my — Member only
===================================================== */
export async function GET(_request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            throw new ApiError('Unauthorized', 401);
        }

        const admin = getSupabaseAdminClient();

        const { data, error } = await admin
            .from('mentor_requests')
            .select(SELECT)
            .eq('requester_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw new ApiError(error.message, 500, error);
        }

        return apiSuccess((data ?? []).map((row) => mapRequest(row as unknown as Record<string, unknown>)));
    } catch (error) {
        return handleError(error);
    }
}
