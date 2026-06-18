import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/api-error';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { optionalString, readJsonBody, requireString } from '@/lib/api/validation';

import type {
    TrainingRelationInput,
    TrainingRelationRecord,
} from '@/types/training-link.types';

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
            (usersResult.data ?? []).map((item) => [item.id, item.branch_id]),
        ),
    };
}

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();

        const url = new URL(request.url);

        const search =
            url.searchParams.get('search')?.trim().toLowerCase() ?? '';

        const mentorId = url.searchParams.get('mentorId');
        const discipleId = url.searchParams.get('discipleId');
        const courseId = url.searchParams.get('courseId');

        const [relationsResult, refs] = await Promise.all([
            admin
                .from('training_links')
                .select('*')
                .order('start_date', { ascending: false }),
            loadReferences(admin),
        ]);

        if (relationsResult.error) {
            throw relationsResult.error;
        }

        const records = (relationsResult.data ?? []).filter((item) => {
            if (mentorId && item.mentor_id !== mentorId) return false;
            if (discipleId && item.disciple_id !== discipleId) return false;
            if (courseId && item.course_id !== courseId) return false;

            if (!search) return true;

            const mentorName =
                refs.userNames.get(item.mentor_id)?.toLowerCase() ?? '';

            const discipleName =
                refs.userNames.get(item.disciple_id)?.toLowerCase() ?? '';

            const courseName =
                refs.courseNames.get(item.course_id)?.toLowerCase() ?? '';

            const branchId =
                refs.branchByUserId.get(item.mentor_id) ?? null;

            const branchName = branchId
                ? refs.branchNames.get(branchId)?.toLowerCase() ?? ''
                : '';

            return [
                mentorName,
                discipleName,
                courseName,
                branchName,
                item.created_by,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(search),
                );
        });

        return apiSuccess(records.map((item) => mapRelation(item, refs)));
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();

        const body =
            await readJsonBody<Partial<TrainingRelationInput>>(request);

        const payload = {
            course_id: requireString(body.courseId, 'courseId'),
            mentor_id: requireString(body.mentorId, 'mentorId'),
            disciple_id: requireString(body.discipleId, 'discipleId'),
            start_date: requireString(body.startDate, 'startDate'),
            end_date: optionalString(body.endDate),
            status: body.status ?? 'in_progress',
            notes: optionalString(body.notes),
            created_by: body.createdBy ?? null,
        };

        const { data, error } = await admin
            .from('training_links')
            .insert(payload)
            .select()
            .single();

        if (error) {
            throw error;
        }

        const refs = await loadReferences(admin);

        return apiSuccess(mapRelation(data as RelationRow, refs), 201);
    } catch (error) {
        return handleError(error);
    }
}
