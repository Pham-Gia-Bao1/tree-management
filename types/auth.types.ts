// types/auth.types.ts

// Role values from the users.role enum in the DB (user_role enum):
// 'ADMIN' | 'MEMBER' | 'PRE_REGISTERED_MENTOR'
export type UserRoleCode = 'ADMIN' | 'MEMBER' | 'PRE_REGISTERED_MENTOR';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRoleCode;
  branchId: string | null;
}
