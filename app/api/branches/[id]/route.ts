import { NextRequest } from 'next/server';

import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

import type {
  BranchInput,
  BranchRecord,
} from '@/types/branch.types';

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;
  is_active: boolean;
};

type BranchUpdatePayload = {
  code?: string;
  name?: string;
  city?: string;
  is_active?: boolean;
};

function mapBranch(
  row: BranchRow,
  counts: {
    members: number;
    mentors: number;
    trainings: number;
  }
): BranchRecord {
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
    return apiFailure(
      error.message,
      error.status,
      error.details
    );
  }

  return apiFailure(
    error instanceof Error
      ? error.message
      : 'Unexpected error.',
    500,
    error
  );
}

async function buildBranchCounts(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  branchId: string
) {
  const [{ count: membersCount }, usersResult] =
    await Promise.all([
      admin
        .from('users')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('branch_id', branchId),

      admin
        .from('users')
        .select('id')
        .eq('branch_id', branchId),
    ]);

  const userIds =
    usersResult.data?.map(user => user.id) ?? [];

  let mentors = 0;
  let trainings = 0;

  if (userIds.length > 0) {
    const [mentorResult, trainingResult] =
      await Promise.all([
        admin
          .from('training_links')
          .select('mentor_id')
          .in('mentor_id', userIds),

        admin
          .from('training_links')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .in('mentor_id', userIds),
      ]);

    mentors = mentorResult.data?.length ?? 0;
    trainings = trainingResult.count ?? 0;
  }

  return {
    members: membersCount ?? 0,
    mentors,
    trainings,
  };
}

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const admin = getSupabaseAdminClient();

    const { data, error } = await admin
      .from('branches')
      .select('*')
      .eq('id', requireString(id, 'id'))
      .single();

    if (error) {
      throw error;
    }

    const counts = await buildBranchCounts(
      admin,
      data.id
    );

    return apiSuccess(
      mapBranch(data as BranchRow, counts)
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const admin = getSupabaseAdminClient();

    const body =
      await readJsonBody<Partial<BranchInput>>(
        request
      );

    const payload: BranchUpdatePayload = {};

    if (body.code !== undefined) {
      payload.code = requireString(
        body.code,
        'code'
      ).toUpperCase();
    }

    if (body.name !== undefined) {
      payload.name = requireString(
        body.name,
        'name'
      );
    }

    if (body.city !== undefined) {
      payload.city = requireString(
        body.city,
        'city'
      );
    }

    if (body.isActive !== undefined) {
      payload.is_active = body.isActive;
    }

    if (Object.keys(payload).length === 0) {
      throw new ApiError(
        'No update fields were provided.',
        400
      );
    }

    const { data, error } = await admin
      .from('branches')
      .update(payload)
      .eq('id', requireString(id, 'id'))
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const counts = await buildBranchCounts(
      admin,
      data.id
    );

    return apiSuccess(
      mapBranch(data as BranchRow, counts)
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const admin = getSupabaseAdminClient();

    const { error } = await admin
      .from('branches')
      .delete()
      .eq('id', requireString(id, 'id'));

    if (error) {
      throw error;
    }

    return apiSuccess({
      deleted: true,
    });
  } catch (error) {
    return handleError(error);
  }
}
