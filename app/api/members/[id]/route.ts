// app/api/members/[id]/route.ts
import { NextRequest } from 'next/server';

import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

import {
  AncestorNodeRecord,
  DescendantNodeRecord,
  MemberDetailResponse,
  MemberProfileRecord,
  MentorStatRecord,
} from '@/types/member.types';

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

function mapMember(
  row: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    birth_date: string | null;
    phone: string | null;
    avatar_url: string | null;
    branch_id: string | null;
  },
  branchNames: Map<string, string>,
): MemberProfileRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    birthDate: row.birth_date,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    branchId: row.branch_id,
    branchName: row.branch_id
      ? branchNames.get(row.branch_id)
      : undefined,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const memberId = requireString(id, 'id');

    const courseId =
      new URL(request.url).searchParams.get('courseId');

    const admin = getSupabaseAdminClient();

    const [
      memberResult,
      usersResult,
      branchesResult,
      coursesResult,
      linksResult,
    ] = await Promise.all([
      admin.from('users').select('*').eq('id', memberId).single(),

      admin
        .from('users')
        .select(
          `
          id,
          full_name,
          email,
          role,
          status,
          birth_date,
          phone,
          avatar_url,
          branch_id
        `,
        ),

      admin.from('branches').select('id,name'),

      admin.from('courses').select('id,name'),

      admin.from('training_links').select('*'),
    ]);

    if (memberResult.error) throw memberResult.error;
    if (usersResult.error) throw usersResult.error;
    if (branchesResult.error) throw branchesResult.error;
    if (coursesResult.error) throw coursesResult.error;
    if (linksResult.error) throw linksResult.error;

    const users = usersResult.data ?? [];
    const links = linksResult.data ?? [];

    const usersById = new Map(
      users.map((u) => [u.id, u]),
    );

    const branchNames = new Map(
      (branchesResult.data ?? []).map((b) => [
        b.id,
        b.name,
      ]),
    );

    const courseNames = new Map(
      (coursesResult.data ?? []).map((c) => [
        c.id,
        c.name,
      ]),
    );

    // =====================================================
    // MENTOR STATS
    // =====================================================

    const statsByCourse = new Map<string, number>();

    links
      .filter((l) => l.mentor_id === memberId)
      .forEach((l) => {
        statsByCourse.set(
          l.course_id,
          (statsByCourse.get(l.course_id) ?? 0) + 1,
        );
      });

    const mentorStats: MentorStatRecord[] = [
      ...statsByCourse.entries(),
    ].map(([cId, total]) => ({
      courseId: cId,
      courseName:
        courseNames.get(cId) ?? cId,
      totalDisciples: total,
    }));

    const descendants: DescendantNodeRecord[] = [];
    const ancestors: AncestorNodeRecord[] = [];

    // =====================================================
    // COURSE TREE
    // =====================================================

    if (courseId) {
      const courseLinks = links.filter(
        (l) => l.course_id === courseId,
      );

      // =================================================
      // DESCENDANTS
      // =================================================

      const descendantLevelMap = new Map<
        string,
        number
      >([[memberId, -1]]);

      let frontier = [memberId];

      const descendantLinks: typeof courseLinks = [];

      while (frontier.length > 0) {
        const next: string[] = [];

        for (const currentId of frontier) {
          for (const link of courseLinks) {
            if (
              link.mentor_id === currentId &&
              !descendantLevelMap.has(
                link.disciple_id,
              )
            ) {
              descendantLevelMap.set(
                link.disciple_id,
                (descendantLevelMap.get(currentId) ??
                  -1) + 1,
              );

              descendantLinks.push(link);

              next.push(link.disciple_id);
            }
          }
        }

        frontier = next;
      }

      descendantLinks.forEach((link) => {
        const user = usersById.get(
          link.disciple_id,
        );

        if (!user) return;

        descendants.push({
          member: mapMember(
            user,
            branchNames,
          ),
          level:
            descendantLevelMap.get(
              link.disciple_id,
            ) ?? 0,
          link: {
            id: link.id,
            mentorId: link.mentor_id,
            discipleId: link.disciple_id,
            // DB columns are start_month / end_month
            startMonth: link.start_month,
            endMonth: link.end_month,
            status: link.status,
          },
        });
      });

      // =================================================
      // ANCESTORS
      // =================================================

      let currentDiscipleId = memberId;
      let level = 0;

      const visited = new Set<string>();

      while (true) {
        const parentLink = courseLinks.find(
          (l) =>
            l.disciple_id === currentDiscipleId,
        );

        if (!parentLink) {
          break;
        }

        if (
          visited.has(parentLink.mentor_id)
        ) {
          break;
        }

        visited.add(parentLink.mentor_id);

        const mentor = usersById.get(
          parentLink.mentor_id,
        );

        if (!mentor) {
          break;
        }

        ancestors.push({
          member: mapMember(
            mentor,
            branchNames,
          ),
          level,
          link: {
            id: parentLink.id,
            mentorId: parentLink.mentor_id,
            discipleId:
              parentLink.disciple_id,
            // DB columns are start_month / end_month
            startMonth:
              parentLink.start_month,
            endMonth:
              parentLink.end_month,
            status: parentLink.status,
          },
        });

        currentDiscipleId =
          parentLink.mentor_id;

        level += 1;
      }
    }

    const response: MemberDetailResponse = {
      member: mapMember(
        memberResult.data,
        branchNames,
      ),
      mentorStats,
      descendants,
      ancestors,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleError(error);
  }
}
