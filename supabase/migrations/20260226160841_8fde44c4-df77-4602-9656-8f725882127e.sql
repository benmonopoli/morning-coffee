-- Fix saved_reports RLS to avoid querying auth.users in policy expressions
-- and allow inserts only for the authenticated user's own row.

DROP POLICY IF EXISTS "Allowed users can access saved_reports" ON public.saved_reports;

CREATE POLICY "Allowed users can view saved_reports"
ON public.saved_reports
FOR SELECT
TO authenticated
USING (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Allowed users can insert own saved_reports"
ON public.saved_reports
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
  AND user_id = auth.uid()
);

CREATE POLICY "Allowed users can update saved_reports"
ON public.saved_reports
FOR UPDATE
TO authenticated
USING (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Allowed users can delete saved_reports"
ON public.saved_reports
FOR DELETE
TO authenticated
USING (
  public.is_allowed_email(COALESCE(auth.jwt() ->> 'email', ''))
);