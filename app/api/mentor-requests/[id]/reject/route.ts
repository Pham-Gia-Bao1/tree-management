import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

type RouteContext = {
    params: Promise<{ id: string }>;
};

function handleError(error: unknown) {
    console.error('[mentor_requests/reject error]', error);
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
   PUT /api/mentor-requests/[id]/reject — Admin only
===================================================== */
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const currentAdmin = await requireAdmin();
        const { id } = await context.params;

        const body = await readJsonBody<{ reviewNote: string }>(request);
        const reviewNote = requireString(body.reviewNote, 'reviewNote');

        const admin = getSupabaseAdminClient();

        const { data: mentorRequest, error: fetchError } = await admin
            .from('mentor_requests')
            .select('id, status')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw new ApiError(fetchError.message, 500, fetchError);
        if (!mentorRequest) throw new ApiError('Mentor request not found.', 404);
        if (mentorRequest.status !== 'pending') {
            throw new ApiError('Only pending requests can be rejected.', 400);
        }

        const { error: updateError } = await admin
            .from('mentor_requests')
            .update({
                status: 'rejected',
                review_note: reviewNote,
                reviewed_by: currentAdmin.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) throw new ApiError(updateError.message, 500, updateError);

        return apiSuccess({ id, status: 'rejected' });
    } catch (error) {
        return handleError(error);
    }
}
