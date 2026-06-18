// app/api/auth/register/route.ts
import bcrypt from 'bcryptjs';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const DEFAULT_ROLE_CODE = 'MEMBER';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, birthDate, branchId, phone } = body;

    if (!email) {
      return apiFailure('Email is required', 400);
    }
    if (!password) {
      return apiFailure('Password is required', 400);
    }
    if (!fullName) {
      return apiFailure('Full name is required', 400);
    }

    const admin = getSupabaseAdminClient();

    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return apiFailure('Email already exists', 400);
    }

    // NOTE: "role" is no longer a column on users. The default MEMBER role is
    // now looked up from the "roles" table and linked through "user_roles".
    const { data: memberRole, error: roleError } = await admin
      .from('roles')
      .select('id, code')
      .eq('code', DEFAULT_ROLE_CODE)
      .single();

    if (roleError || !memberRole) {
      throw new Error('Default member role is not configured');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await admin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        birth_date: birthDate || null,
        branch_id: branchId || null,
        phone: phone || null,
        status: 'pending',
      })
      .select(
        `
        id,
        email,
        full_name,
        status
      `
      )
      .single();

    if (error) {
      throw error;
    }

    // TODO: this insert + role assignment ideally belongs in a single DB
    // transaction (e.g. a Postgres RPC function) so a failure here doesn't
    // leave a created user with zero roles. Left as two sequential calls
    // since the Supabase JS client doesn't support multi-table transactions.
    const { error: userRoleError } = await admin
      .from('user_roles')
      .insert({
        user_id: data.id,
        role_id: memberRole.id,
      });

    if (userRoleError) {
      // best-effort cleanup so we don't leave an orphan user with no role
      await admin.from('users').delete().eq('id', data.id);
      throw userRoleError;
    }

    return apiSuccess(
      {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        roles: [memberRole.code],
        status: data.status,
      },
      201
    );
  } catch (error) {
    console.error(error);
    return apiFailure(
      error instanceof Error ? error.message : 'Unexpected error',
      500
    );
  }
}
