import { ApiError } from '@/lib/api/api-error';
import { getCurrentUser } from './get-current-user';

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!user.roles.includes('ADMIN')) {
    throw new ApiError('Forbidden', 403);
  }

  return user;
}
