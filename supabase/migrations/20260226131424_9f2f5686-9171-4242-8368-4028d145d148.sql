-- Tighten report_runs: only allowed users can access
DROP POLICY IF EXISTS "Authenticated users can access report_runs" ON public.report_runs;

CREATE POLICY "Allowed users can access report_runs"
  ON public.report_runs FOR ALL
  TO authenticated
  USING (public.is_allowed_email((SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (public.is_allowed_email((SELECT email FROM auth.users WHERE id = auth.uid())));