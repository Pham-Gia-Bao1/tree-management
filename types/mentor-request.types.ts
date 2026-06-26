import type { MentorRequestStatus } from '@/types/database.types';

export interface MentorRequestRecord {
    id: string;
    status: MentorRequestStatus;
    reason: string | null;
    experience: string | null;
    notes: string | null;
    reviewNote: string | null;
    createdAt: string;
    updatedAt: string | null;
    reviewedAt: string | null;
    requester: {
        id: string;
        name: string;
        email: string;
        branch: { id: string; name: string; city: string } | null;
    } | null;
    reviewedBy: {
        id: string;
        name: string;
        email: string;
    } | null;
}

export interface CreateMentorRequestInput {
    reason: string;
    experience: string;
    notes?: string;
}
