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

// ======================================================
// TYPES
// ======================================================

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

// ======================================================
// HELPERS
// ======================================================

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
        return apiFailure(
            error.message,
            error.status,
            error.details,
        );
    }

    return apiFailure(
        error instanceof Error
            ? error.message
            : 'Unexpected error.',
        500,
        error,
    );
}

async function loadReferences(
    admin: ReturnType<typeof getSupabaseAdminClient>,
): Promise<References> {
    const [usersResult, branchesResult, coursesResult] =
        await Promise.all([
            admin.from('users').select(
                'id, full_name, branch_id',
            ),
            admin.from('branches').select('id, name'),
            admin.from('courses').select('id, name'),
        ]);

    if (usersResult.error) throw usersResult.error;
    if (branchesResult.error) throw branchesResult.error;
    if (coursesResult.error) throw coursesResult.error;

    return {
        courseNames: new Map(
            (coursesResult.data ?? []).map((i) => [
                i.id,
                i.name,
            ]),
        ),

        userNames: new Map(
            (usersResult.data ?? []).map((i) => [
                i.id,
                i.full_name,
            ]),
        ),

        branchNames: new Map(
            (branchesResult.data ?? []).map((i) => [
                i.id,
                i.name,
            ]),
        ),

        branchByUserId: new Map(
            (usersResult.data ?? []).map((i) => [
                i.id,
                i.branch_id,
            ]),
        ),
    };
}

// ======================================================
// BUSINESS VALIDATION
// ======================================================

async function validateTrainingRelation(
    admin: ReturnType<typeof getSupabaseAdminClient>,
    payload: {
        id?: string;
        courseId: string;
        mentorId: string;
        discipleId: string;
        startDate: string;
        endDate?: string | null;
    },
) {
    const {
        id,
        courseId,
        mentorId,
        discipleId,
        startDate,
        endDate,
    } = payload;

    // mentor != disciple

    if (mentorId === discipleId) {
        throw new ApiError(
            'Mentor and disciple cannot be the same person.',
            400,
        );
    }

    // date validation

    if (
        endDate &&
        new Date(endDate) < new Date(startDate)
    ) {
        throw new ApiError(
            'End date must be after start date.',
            400,
        );
    }

    // existence check

    const [mentorResult, discipleResult, courseResult] =
        await Promise.all([
            admin
                .from('users')
                .select('id,status')
                .eq('id', mentorId)
                .single(),

            admin
                .from('users')
                .select('id,status')
                .eq('id', discipleId)
                .single(),

            admin
                .from('courses')
                .select('id')
                .eq('id', courseId)
                .single(),
        ]);

    if (!mentorResult.data) {
        throw new ApiError('Mentor not found.', 404);
    }

    if (!discipleResult.data) {
        throw new ApiError('Disciple not found.', 404);
    }

    if (!courseResult.data) {
        throw new ApiError('Course not found.', 404);
    }

    if (mentorResult.data.status !== 'active') {
        throw new ApiError(
            'Mentor must be active.',
            400,
        );
    }

    if (discipleResult.data.status !== 'active') {
        throw new ApiError(
            'Disciple must be active.',
            400,
        );
    }

    // disciple already has active mentor

    const activeResult = await admin
        .from('training_links')
        .select('id')
        .eq('course_id', courseId)
        .eq('disciple_id', discipleId)
        .eq('status', 'in_progress');

    if (activeResult.error) {
        throw activeResult.error;
    }

    const duplicated = (activeResult.data ?? []).find(
        (x) => x.id !== id,
    );

    if (duplicated) {
        throw new ApiError(
            'Disciple already has an active mentor in this course.',
            400,
        );
    }

    // prevent circular tree

    const linksResult = await admin
        .from('training_links')
        .select('mentor_id, disciple_id');

    if (linksResult.error) {
        throw linksResult.error;
    }

    const childrenMap = new Map<string, string[]>();

    (linksResult.data ?? []).forEach((link) => {
        if (!childrenMap.has(link.mentor_id)) {
            childrenMap.set(link.mentor_id, []);
        }

        childrenMap
            .get(link.mentor_id)!
            .push(link.disciple_id);
    });

    const stack = [discipleId];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const current = stack.pop()!;

        if (current === mentorId) {
            throw new ApiError(
                'This relation creates a circular tree.',
                400,
            );
        }

        if (visited.has(current)) continue;

        visited.add(current);

        const children =
            childrenMap.get(current) ?? [];

        stack.push(...children);
    }
}

// ======================================================
// GET
// ======================================================

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();

        const url = new URL(request.url);

        const search =
            url.searchParams
                .get('search')
                ?.trim()
                .toLowerCase() ?? '';

        const mentorId =
            url.searchParams.get('mentorId');

        const discipleId =
            url.searchParams.get('discipleId');

        const courseId =
            url.searchParams.get('courseId');

        const [relationsResult, refs] =
            await Promise.all([
                admin
                    .from('training_links')
                    .select('*')
                    .order('start_date', {
                        ascending: false,
                    }),

                loadReferences(admin),
            ]);

        if (relationsResult.error)
            throw relationsResult.error;

        const rows =
            (relationsResult.data ??
                []) as unknown as RelationRow[];

        const filtered = rows.filter((row) => {
            if (
                mentorId &&
                row.mentor_id !== mentorId
            )
                return false;

            if (
                discipleId &&
                row.disciple_id !== discipleId
            )
                return false;

            if (
                courseId &&
                row.course_id !== courseId
            )
                return false;

            if (!search) return true;

            const branchId =
                refs.branchByUserId.get(
                    row.mentor_id,
                ) ?? null;

            return [
                refs.userNames.get(row.mentor_id),
                refs.userNames.get(
                    row.disciple_id,
                ),
                refs.courseNames.get(row.course_id),
                branchId
                    ? refs.branchNames.get(
                          branchId,
                      )
                    : null,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(search),
                );
        });

        return apiSuccess(
            filtered.map((row) =>
                mapRelation(row, refs),
            ),
        );
    } catch (error) {
        return handleError(error);
    }
}

// ======================================================
// POST
// ======================================================

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();

        const body =
            await readJsonBody<
                Partial<TrainingRelationInput>
            >(request);

        const payload = {
            course_id: requireString(
                body.courseId,
                'courseId',
            ),

            mentor_id: requireString(
                body.mentorId,
                'mentorId',
            ),

            disciple_id: requireString(
                body.discipleId,
                'discipleId',
            ),

            start_date: requireString(
                body.startDate,
                'startDate',
            ),

            end_date:
                optionalString(body.endDate) ??
                null,

            status:
                body.status ?? 'in_progress',

            notes:
                optionalString(body.notes) ?? null,

            created_by:
                body.createdBy ?? null,
        };

        await validateTrainingRelation(admin, {
            courseId: payload.course_id,
            mentorId: payload.mentor_id,
            discipleId: payload.disciple_id,
            startDate: payload.start_date,
            endDate: payload.end_date,
        });

        const { data, error } = await admin
            .from('training_links')
            .insert(payload)
            .select('*')
            .single();

        if (error) throw error;

        const refs = await loadReferences(admin);

        return apiSuccess(
            mapRelation(
                data as RelationRow,
                refs,
            ),
            201,
        );
    } catch (error) {
        return handleError(error);
    }
}
