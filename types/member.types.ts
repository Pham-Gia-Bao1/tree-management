// types/member.types.ts

export interface MemberProfileRecord {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    birthDate: string | null;
    phone: string | null;
    avatarUrl: string | null;
    branchId: string | null;
    branchName?: string;
}

export interface MentorStatRecord {
    courseId: string;
    courseName: string;
    totalDisciples: number;
}

export interface DescendantLinkRecord {
    id: string;
    mentorId: string;
    discipleId: string;
    startMonth: string;
    endMonth: string | null;
    status: 'in_progress' | 'completed';
}

export interface DescendantNodeRecord {
    member: MemberProfileRecord;
    level: number;
    link: DescendantLinkRecord;
}

export interface MemberDetailResponse {
  member: MemberProfileRecord;
  mentorStats: MentorStatRecord[];
  descendants: DescendantNodeRecord[];
  ancestors: AncestorNodeRecord[];
}

export interface AncestorNodeRecord {
  member: MemberProfileRecord;
  level: number; // 0 = mentor trực tiếp, 1 = mentor của mentor...
  link: {
    id: string;
    mentorId: string;
    discipleId: string;
    startMonth: string | null;
    endMonth: string | null;
    status: string;
  };
}
