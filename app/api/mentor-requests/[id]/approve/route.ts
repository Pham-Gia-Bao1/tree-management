import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

type RouteContext = {
    params: Promise<{ id: string }>;
};

function handleError(error: unknown) {
    console.error('[mentor_requests/approve error]', error);
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
   PUT /api/mentor-requests/[id]/approve — Admin only
   Transaction:
   1. Update mentor_requests status = 'approved'
   2. Find MENTOR role from roles table
   3. Insert into user_roles (prevent duplicate)
===================================================== */
export async function PUT(_request: NextRequest, context: RouteContext) {
    try {
        const currentAdmin = await requireAdmin();
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();

        // Get the request to find requester_id
        const { data: mentorRequest, error: fetchError } = await admin
            .from('mentor_requests')
            .select('id, requester_id, status')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw new ApiError(fetchError.message, 500, fetchError);
        if (!mentorRequest) throw new ApiError('Mentor request not found.', 404);
        if (mentorRequest.status !== 'pending') {
            throw new ApiError('Only pending requests can be approved.', 400);
        }
        if (!mentorRequest.requester_id) {
            throw new ApiError('Request has no requester.', 400);
        }

        // 1. Update mentor_requests
        const { error: updateError } = await admin
            .from('mentor_requests')
            .update({
                status: 'approved',
                reviewed_by: currentAdmin.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) throw new ApiError(updateError.message, 500, updateError);

        // 2. Find MENTOR role
        const { data: mentorRole, error: roleError } = await admin
            .from('roles')
            .select('id')
            .eq('code', 'MENTOR')
            .single();

        if (roleError || !mentorRole) {
            throw new ApiError('MENTOR role not found in roles table.', 500);
        }

        // 3. Insert into user_roles (upsert to prevent duplicate)
        const { error: userRoleError } = await admin
            .from('user_roles')
            .upsert(
                {
                    user_id: mentorRequest.requester_id,
                    role_id: mentorRole.id,
                },
                { onConflict: 'user_id,role_id', ignoreDuplicates: true },
            );

        if (userRoleError) throw new ApiError(userRoleError.message, 500, userRoleError);

        return apiSuccess({ id, status: 'approved' });
    } catch (error) {
        return handleError(error);
    }
}
