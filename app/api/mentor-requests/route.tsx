import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString, optionalString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { MentorRequestStatus } from '@/types/database.types';

/* =====================================================
   ERROR HANDLER
===================================================== */
function handleError(error: unknown) {
    console.error('[mentor_requests api error]', error);
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
   FULL JOIN SELECT
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

/* =====================================================
   MAPPER
===================================================== */
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
   GET /api/mentor-requests — Admin only
===================================================== */
export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const admin = getSupabaseAdminClient();
        const url = new URL(request.url);
        const status = url.searchParams.get('status') as MentorRequestStatus | null;
        const search = url.searchParams.get('search');
        const branchId = url.searchParams.get('branchId');

        let query = admin
            .from('mentor_requests')
            .select(SELECT)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            throw new ApiError(error.message, 500, error);
        }

        let result = (data ?? []).map((row) => mapRequest(row as unknown as Record<string, unknown>));

        // Client-side filter by search / branch since Supabase nested filter is complex
        if (search) {
            const kw = search.toLowerCase();
            result = result.filter(
                (r) =>
                    r?.requester?.name?.toLowerCase().includes(kw) ||
                    r?.requester?.email?.toLowerCase().includes(kw),
            );
        }

        if (branchId) {
            result = result.filter((r) => r?.requester?.branch?.id === branchId);
        }

        return apiSuccess(result);
    } catch (error) {
        return handleError(error);
    }
}

/* =====================================================
   POST /api/mentor-requests — Member only
===================================================== */
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            throw new ApiError('Unauthorized', 401);
        }

        if (!currentUser.roles.includes('MEMBER')) {
            throw new ApiError('Only members can submit mentor requests.', 403);
        }

        if (currentUser.roles.includes('MENTOR')) {
            throw new ApiError('You are already a mentor.', 400);
        }

        const admin = getSupabaseAdminClient();

        // Check for existing pending request
        const { data: existing } = await admin
            .from('mentor_requests')
            .select('id')
            .eq('requester_id', currentUser.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (existing) {
            throw new ApiError('You already have a pending mentor request.', 400);
        }

        // Check all required courses are completed
        const { data: courses } = await admin
            .from('courses')
            .select('id')
            .eq('is_active', true);

        const requiredCourseIds = (courses ?? []).map((c) => c.id);

        if (requiredCourseIds.length > 0) {
            const { data: completedProgress } = await admin
                .from('user_course_progress')
                .select('course_id')
                .eq('user_id', currentUser.id)
                .eq('status', 'completed')
                .in('course_id', requiredCourseIds);

            const completedIds = new Set((completedProgress ?? []).map((p) => p.course_id));
            const allCompleted = requiredCourseIds.every((id) => completedIds.has(id));

            if (!allCompleted) {
                throw new ApiError('You must complete all required courses before requesting to become a mentor.', 400);
            }

            // Check no active training in progress
            const { data: activeTraining } = await admin
                .from('user_course_progress')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('status', 'in_progress')
                .maybeSingle();

            if (activeTraining) {
                throw new ApiError('You have an active training in progress. Please complete it first.', 400);
            }
        }

        const body = await readJsonBody<{
            reason: string;
            experience: string;
            notes?: string;
        }>(request);

        const { data, error } = await admin
            .from('mentor_requests')
            .insert({
                requester_id: currentUser.id,
                reason: requireString(body.reason, 'reason'),
                experience: requireString(body.experience, 'experience'),
                notes: optionalString(body.notes),
                status: 'pending',
            })
            .select(SELECT)
            .single();

        if (error) {
            throw new ApiError(error.message, 500, error);
        }

        return apiSuccess(mapRequest(data as unknown as Record<string, unknown>), 201);
    } catch (error) {
        return handleError(error);
    }
}
