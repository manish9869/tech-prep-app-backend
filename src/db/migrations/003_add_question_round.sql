-- Explicit interview-round tagging for Mock Interview, replacing the type/difficulty
-- heuristic. NULL means "not tagged yet" — the app falls back to the old heuristic for
-- those rows, so existing questions keep working until manually re-tagged. Safe to run
-- multiple times.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS round text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questions_round_check'
    ) THEN
        ALTER TABLE questions ADD CONSTRAINT questions_round_check
            CHECK (round IS NULL OR round IN ('screening', 'technical', 'manager', 'hr'));
    END IF;
END $$;
