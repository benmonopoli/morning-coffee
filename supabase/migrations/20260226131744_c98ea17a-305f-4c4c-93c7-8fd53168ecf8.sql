-- Trigger: auto-add first user as admin, subsequent users as members (if allowed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_count int;
BEGIN
  -- Count existing users with roles
  SELECT count(*) INTO _user_count FROM public.user_roles;
  
  IF _user_count = 0 THEN
    -- First user ever: make them admin AND add to allowed_users
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.allowed_users (email, added_by)
    VALUES (lower(NEW.email), NEW.id)
    ON CONFLICT (email) DO NOTHING;
  ELSE
    -- Subsequent users: only add role if they're in allowed_users
    IF public.is_allowed_email(NEW.email) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach to auth.users (on insert, after signup)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();