CREATE TABLE public.report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to report_runs" ON public.report_runs
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.report_runs (last_run_at) VALUES (null);
