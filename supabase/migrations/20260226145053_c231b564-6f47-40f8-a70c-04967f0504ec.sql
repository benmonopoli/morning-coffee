
-- Create saved_reports table to persist full report results
CREATE TABLE public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  results_by_role JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'complete'
);

-- Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Any allowed user can read/write saved_reports
CREATE POLICY "Allowed users can access saved_reports" ON public.saved_reports
  FOR ALL
  USING (
    is_allowed_email((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text)
  )
  WITH CHECK (
    is_allowed_email((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text)
  );

-- Seed report_runs with a row if none exists (fixes the timestamp-never-saves bug)
INSERT INTO public.report_runs (id, last_run_at)
VALUES ('00000000-0000-0000-0000-000000000001', null)
ON CONFLICT (id) DO NOTHING;
