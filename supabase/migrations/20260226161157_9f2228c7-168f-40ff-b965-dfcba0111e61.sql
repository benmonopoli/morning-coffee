-- Fix report_runs and actioned_candidates RLS to use JWT email instead of auth.users subquery

-- report_runs
DROP POLICY IF EXISTS "Allowed users can access report_runs" ON public.report_runs;

CREATE POLICY "Allowed users can access report_runs"
ON public.report_runs
FOR ALL
TO authenticated
USING (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
);

-- actioned_candidates
DROP POLICY IF EXISTS "Allowed users can access actioned_candidates" ON public.actioned_candidates;

CREATE POLICY "Allowed users can access actioned_candidates"
ON public.actioned_candidates
FOR ALL
TO authenticated
USING (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
);