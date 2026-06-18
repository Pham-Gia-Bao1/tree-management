// ── Record returned by the API (camelCase) ─────────────────────────────────────
export interface TrainingRelationRecord {
    id: string;
    courseId: string;
    courseName?: string;
    mentorId: string;
    mentorName?: string;
    discipleId: string;
    discipleName?: string;
    branchName?: string;
    /** ISO date string "YYYY-MM-DD" */
    startDate: string;
    /** ISO date string "YYYY-MM-DD" or null */
    endDate: string | null;
    status: 'in_progress' | 'completed';
    notes: string | null;
    createdBy: string | null;
}

// ── Input accepted by POST / PUT endpoints ─────────────────────────────────────
export interface TrainingRelationInput {
    courseId: string;
    mentorId: string;
    discipleId: string;
    /** ISO date string "YYYY-MM-DD" */
    startDate: string;
    /** ISO date string "YYYY-MM-DD" — optional */
    endDate?: string | null;
    status?: 'in_progress' | 'completed';
    notes?: string | null;
    createdBy?: string | null;
}
