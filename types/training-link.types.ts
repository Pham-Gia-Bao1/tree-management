// types/training-link.types.ts

// ── Record returned by the API ────────────────────────────────────────────────
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
    /** ISO timestamp — set by DB default */
    createdAt: string;
    /** ISO timestamp — updated automatically by trigger on every PATCH */
    updatedAt: string;
}

// ── Input accepted by POST / PATCH endpoints ──────────────────────────────────
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
    // createdAt / updatedAt are never sent by the client — managed by DB
}
