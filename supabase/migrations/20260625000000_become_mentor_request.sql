-- =====================================================
-- MIGRATION: Update mentor_requests for "Become Mentor" feature
-- Drops old FK columns (mentor_id, course_id) and adds
-- reason, experience, notes, review_note columns.
-- =====================================================

-- Drop old FK indexes / columns if they exist
ALTER TABLE public.mentor_requests
    DROP COLUMN IF EXISTS mentor_id,
    DROP COLUMN IF EXISTS course_id;

-- Add new columns for the "Become Mentor" request
ALTER TABLE public.mentor_requests
    ADD COLUMN IF NOT EXISTS reason       text,
    ADD COLUMN IF NOT EXISTS experience   text,
    ADD COLUMN IF NOT EXISTS notes        text,
    ADD COLUMN IF NOT EXISTS review_note  text;

-- Index on status for fast filtering
CREATE INDEX IF NOT EXISTS mentor_requests_status_idx
    ON public.mentor_requests(status);
