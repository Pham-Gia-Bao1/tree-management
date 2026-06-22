export interface TrainingRelationRecord {
    id: string;

    courseId: string;
    courseName?: string;

    mentorId: string;
    mentorName?: string;

    discipleId: string;
    discipleName?: string;

    branchName?: string;

    startDate: string;
    endDate: string | null;

    status: 'in_progress' | 'completed';

    notes: string | null;

    createdBy: string | null;

    createdAt: string;
    updatedAt: string;
}


export interface TrainingRelationInput {
    courseId: string;
    mentorId: string;
    discipleId: string;
    startDate: string;
    endDate?: string | null;
    status?: 'in_progress' | 'completed';
    notes?: string | null;
    createdBy?: string | null;
}
