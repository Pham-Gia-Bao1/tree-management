// training-relations/[id]/route.ts
import { NextRequest } from 'next/server';

import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { optionalString, readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { TrainingRelationInput, TrainingRelationRecord } from '@/types/training-link.types';
import { Database } from '@/types/database.types';

type TrainingLinkUpdate = Database['public']['Tables']['training_links']['Update'];

// DB row type — columns are still start_month / end_month in Supabase
type TrainingLinkRow = {
    id: string;
    course_id: string;
    mentor_id: string;
    disciple_id: string;
    start_date: string;       // renamed from start_month
    end_date: string | null;  // renamed from end_month
    status: 'in_progress' | 'completed';
    notes: string | null;
    created_by: string | null;
};

function mapRelation(
    row: TrainingLinkRow,
    refs: {
        courseNames: Map<string, string>;
        mentorNames: Map<string, string>;
        discipleNames: Map<string, string>;
        branchNames: Map<string, string>;
        branchByUserId: Map<string, string | null>;
    },
): TrainingRelationRecord {
    return {
        id: row.id,
        courseId: row.course_id,
        courseName: refs.courseNames.get(row.course_id) ?? undefined,
        mentorId: row.mentor_id,
        mentorName: refs.mentorNames.get(row.mentor_id) ?? undefined,
        discipleId: row.disciple_id,
        discipleName: refs.discipleNames.get(row.disciple_id) ?? undefined,
        branchName: (() => {
            const mentorBranchId = refs.branchByUserId.get(row.mentor_id) ?? null;
            return mentorBranchId ? refs.branchNames.get(mentorBranchId) ?? undefined : undefined;
        })(),
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        notes: row.notes,
        createdBy: row.created_by,
    };
}

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return apiFailure(message, 500, error);
}

async function loadReferences(admin: ReturnType<typeof getSupabaseAdminClient>) {
    const [usersResult, branchesResult, coursesResult] = await Promise.all([
        admin.from('users').select('id, full_name, branch_id'),
        admin.from('branches').select('id, name'),
        admin.from('courses').select('id, name'),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (branchesResult.error) throw branchesResult.error;
    if (coursesResult.error) throw coursesResult.error;

    const branchNames = new Map(
        (branchesResult.data ?? []).map((branch) => [branch.id, branch.name]),
    );
    const branchByUserId = new Map(
        (usersResult.data ?? []).map((user) => [user.id, user.branch_id]),
    );

    return {
        courseNames: new Map((coursesResult.data ?? []).map((course) => [course.id, course.name])),
        mentorNames: new Map((usersResult.data ?? []).map((user) => [user.id, user.full_name])),
        discipleNames: new Map((usersResult.data ?? []).map((user) => [user.id, user.full_name])),
        branchNames,
        branchByUserId,
    };
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;
        const admin = getSupabaseAdminClient();

        const [{ data, error }, refs] = await Promise.all([
            admin.from('training_links').select('*').eq('id', requireString(id, 'id')).single(),
            loadReferences(admin),
        ]);

        if (error) throw error;

        return apiSuccess(mapRelation(data as unknown as TrainingLinkRow, refs));
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
        const body = await readJsonBody<Partial<TrainingRelationInput>>(request);

        const payload: Record<string, unknown> = {};

        if (body.courseId !== undefined)
            payload.course_id = requireString(body.courseId, 'courseId');
        if (body.mentorId !== undefined)
            payload.mentor_id = requireString(body.mentorId, 'mentorId');
        if (body.discipleId !== undefined)
            payload.disciple_id = requireString(body.discipleId, 'discipleId');
        if (body.startDate !== undefined)
            payload.start_date = requireString(body.startDate, 'startDate');

        const endDate = optionalString(body.endDate);
        const notes = optionalString(body.notes);

        if (endDate !== undefined) payload.end_date = endDate;
        if (notes !== undefined) payload.notes = notes;
        if (body.status !== undefined) payload.status = body.status;
        if (body.createdBy !== undefined) payload.created_by = body.createdBy;

        if (Object.keys(payload).length === 0) {
            throw new ApiError('No update fields were provided.', 400);
        }

        const { data, error } = await admin
            .from('training_links')
            .update(payload as unknown as TrainingLinkUpdate)
            .eq('id', requireString(id, 'id'))
            .select('*')
            .single();

        if (error) throw error;

        const refs = await loadReferences(admin);
        return apiSuccess(mapRelation(data as unknown as TrainingLinkRow, refs));
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
            .from('training_links')
            .delete()
            .eq('id', requireString(id, 'id'));

        if (error) throw error;

        return apiSuccess({ deleted: true });
    } catch (error) {
        return handleError(error);
    }
}
