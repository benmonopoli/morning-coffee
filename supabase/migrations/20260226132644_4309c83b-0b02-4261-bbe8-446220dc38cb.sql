
-- Table to track users who signed up but aren't yet approved
CREATE TABLE public.pending_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique on user_id to avoid duplicates
ALTER TABLE public.pending_approvals ADD CONSTRAINT pending_approvals_user_id_key UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- Only admins can view/delete pending approvals
CREATE POLICY "Admins can view pending_approvals"
  ON public.pending_approvals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending_approvals"
  ON public.pending_approvals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update the trigger to also insert into pending_approvals when user is not allowed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_count int;
BEGIN
  SELECT count(*) INTO _user_count FROM public.user_roles;
  
  IF _user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.allowed_users (email, added_by)
    VALUES (lower(NEW.email), NEW.id)
    ON CONFLICT (email) DO NOTHING;
  ELSE
    IF public.is_allowed_email(NEW.email) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      -- Track as pending approval
      INSERT INTO public.pending_approvals (user_id, email)
      VALUES (NEW.id, lower(NEW.email))
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
