export interface MemberProfileRecord {
    id: string;
    fullName: string;
    email: string;
    roles: string[];
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
    startDate: string;
    endDate: string | null;
    status: 'in_progress' | 'completed';
}

export interface DescendantNodeRecord {
    member: MemberProfileRecord;
    level: number;
    link: DescendantLinkRecord;
}

export interface AncestorNodeRecord {
    member: MemberProfileRecord;
    level: number;
    link: {
        id: string;
        mentorId: string;
        discipleId: string;
        startDate: string | null;
        endDate: string | null;
        status: string;
    };
}

export interface MemberDetailResponse {
    member: MemberProfileRecord;
    mentorStats: MentorStatRecord[];
    descendants: DescendantNodeRecord[];
    ancestors: AncestorNodeRecord[];
}
