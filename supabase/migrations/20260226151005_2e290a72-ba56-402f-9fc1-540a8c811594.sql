
CREATE TABLE public.actioned_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id BIGINT UNIQUE NOT NULL,
  action TEXT NOT NULL,
  actioned_at TIMESTAMPTZ DEFAULT now(),
  report_id UUID REFERENCES public.saved_reports(id)
);

ALTER TABLE public.actioned_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed users can access actioned_candidates"
  ON public.actioned_candidates
  FOR ALL
  USING (
    is_allowed_email(
      (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  )
  WITH CHECK (
    is_allowed_email(
      (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  );
