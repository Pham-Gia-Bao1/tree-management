import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/api-error';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
    optionalString,
    readJsonBody,
    requireString,
} from '@/lib/api/validation';

import type {
    TrainingRelationInput,
    TrainingRelationRecord,
} from '@/types/training-link.types';
import type { Database } from '@/types/database.types';

type TrainingLinkUpdate =
    Database['public']['Tables']['training_links']['Update'];

type RelationRow = {
    id: string;
    course_id: string;
    mentor_id: string;
    disciple_id: string;
    start_date: string;
    end_date: string | null;
    status: 'in_progress' | 'completed';
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};

type References = {
    courseNames: Map<string, string>;
    userNames: Map<string, string>;
    branchNames: Map<string, string>;
    branchByUserId: Map<string, string | null>;
};

function mapRelation(
    row: RelationRow,
    refs: References,
): TrainingRelationRecord {
    const mentorBranchId = refs.branchByUserId.get(row.mentor_id);

    return {
        id: row.id,
        courseId: row.course_id,
        courseName: refs.courseNames.get(row.course_id),
        mentorId: row.mentor_id,
        mentorName: refs.userNames.get(row.mentor_id),
        discipleId: row.disciple_id,
        discipleName: refs.userNames.get(row.disciple_id),
        branchName: mentorBranchId
            ? refs.branchNames.get(mentorBranchId)
            : undefined,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }

    return apiFailure(
        error instanceof Error ? error.message : 'Unexpected error.',
        500,
        error,
    );
}

async function loadReferences(
    admin: ReturnType<typeof getSupabaseAdminClient>,
): Promise<References> {
    const [usersResult, branchesResult, coursesResult] = await Promise.all([
        admin.from('users').select('id, full_name, branch_id'),
        admin.from('branches').select('id, name'),
        admin.from('courses').select('id, name'),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (branchesResult.error) throw branchesResult.error;
    if (coursesResult.error) throw coursesResult.error;

    return {
        courseNames: new Map(
            (coursesResult.data ?? []).map((item) => [item.id, item.name]),
        ),
        userNames: new Map(
            (usersResult.data ?? []).map((item) => [item.id, item.full_name]),
        ),
        branchNames: new Map(
            (branchesResult.data ?? []).map((item) => [item.id, item.name]),
        ),
        branchByUserId: new Map(
            (usersResult.data ?? []).map((item) => [
                item.id,
                item.branch_id,
            ]),
        ),
    };
}

async function validateRelation(
    admin: ReturnType<typeof getSupabaseAdminClient>,
    params: {
        mentorId: string;
        discipleId: string;
        courseId: string;
        startDate: string;
        endDate?: string | null;
        relationId?: string;
    },
) {
    const {
        mentorId,
        discipleId,
        courseId,
        startDate,
        endDate,
        relationId,
    } = params;

    if (mentorId === discipleId) {
        throw new ApiError(
            'Mentor cannot train himself/herself.',
            400,
        );
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
        throw new ApiError(
            'End date must be after start date.',
            400,
        );
    }

    const { data: users, error: usersError } = await admin
        .from('users')
        .select('id')
        .in('id', [mentorId, discipleId]);

    if (usersError) throw usersError;

    if ((users ?? []).length !== 2) {
        throw new ApiError(
            'Mentor or disciple does not exist.',
            400,
        );
    }

    let duplicateQuery = admin
        .from('training_links')
        .select('id')
        .eq('course_id', courseId)
        .eq('mentor_id', mentorId)
        .eq('disciple_id', discipleId)
        .eq('status', 'in_progress');

    if (relationId) {
        duplicateQuery = duplicateQuery.neq('id', relationId);
    }

    const { data: duplicates, error: duplicateError } =
        await duplicateQuery;

    if (duplicateError) throw duplicateError;

    if ((duplicates ?? []).length > 0) {
        throw new ApiError(
            'This mentor-disciple relationship already exists.',
            400,
        );
    }

    const { data: links, error: linksError } = await admin
        .from('training_links')
        .select('id, mentor_id, disciple_id')
        .eq('course_id', courseId);

    if (linksError) throw linksError;

    const graph = new Map<string, string[]>();

    (links ?? [])
        .filter((link) => link.id !== relationId)
        .forEach((link) => {
            if (!graph.has(link.mentor_id)) {
                graph.set(link.mentor_id, []);
            }

            graph.get(link.mentor_id)?.push(link.disciple_id);
        });

    if (!graph.has(mentorId)) {
        graph.set(mentorId, []);
    }

    graph.get(mentorId)?.push(discipleId);

    const visited = new Set<string>();

    const dfs = (current: string): boolean => {
        if (current === mentorId && visited.size > 0) {
            return true;
        }

        if (visited.has(current)) return false;

        visited.add(current);

        for (const child of graph.get(current) ?? []) {
            if (dfs(child)) return true;
        }

        return false;
    };

    if (dfs(discipleId)) {
        throw new ApiError(
            'This relationship creates a circular discipleship tree.',
            400,
        );
    }
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;

        const admin = getSupabaseAdminClient();

        const [{ data, error }, refs] = await Promise.all([
            admin
                .from('training_links')
                .select('*')
                .eq('id', requireString(id, 'id'))
                .single(),
            loadReferences(admin),
        ]);

        if (error) throw error;

        return apiSuccess(
            mapRelation(data as RelationRow, refs),
        );
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;

        const relationId = requireString(id, 'id');

        const admin = getSupabaseAdminClient();

        const body =
            await readJsonBody<Partial<TrainingRelationInput>>(
                request,
            );

        const { data: existing, error: existingError } =
            await admin
                .from('training_links')
                .select('*')
                .eq('id', relationId)
                .single();

        if (existingError || !existing) {
            throw new ApiError('Relation not found.', 404);
        }

        const mentorId =
            body.mentorId ?? existing.mentor_id;

        const discipleId =
            body.discipleId ?? existing.disciple_id;

        const courseId =
            body.courseId ?? existing.course_id;

        const startDate =
            body.startDate ?? existing.start_date;

        const endDate =
            body.endDate !== undefined
                ? optionalString(body.endDate)
                : existing.end_date;

        await validateRelation(admin, {
            mentorId,
            discipleId,
            courseId,
            startDate,
            endDate,
            relationId,
        });

        const payload: TrainingLinkUpdate = {};

        if (body.courseId !== undefined) {
            payload.course_id = mentorId
                ? requireString(body.courseId, 'courseId')
                : undefined;
        }

        if (body.mentorId !== undefined) {
            payload.mentor_id = mentorId;
        }

        if (body.discipleId !== undefined) {
            payload.disciple_id = discipleId;
        }

        if (body.startDate !== undefined) {
            payload.start_date = startDate;
        }

        if (body.endDate !== undefined) {
            payload.end_date = optionalString(body.endDate);
        }

        if (body.notes !== undefined) {
            payload.notes = optionalString(body.notes);
        }

        if (body.status !== undefined) {
            payload.status = body.status;
        }

        if (body.createdBy !== undefined) {
            payload.created_by = body.createdBy;
        }

        if (Object.keys(payload).length === 0) {
            throw new ApiError(
                'No update fields were provided.',
                400,
            );
        }

        const { data, error } = await admin
            .from('training_links')
            .update(payload)
            .eq('id', relationId)
            .select('*')
            .single();

        if (error) throw error;

        const refs = await loadReferences(admin);

        return apiSuccess(
            mapRelation(data as RelationRow, refs),
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
            .from('training_links')
            .delete()
            .eq('id', requireString(id, 'id'));

        if (error) throw error;

        return apiSuccess({ deleted: true });
    } catch (error) {
        return handleError(error);
    }
}
