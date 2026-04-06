-- Migration: Add dot position and user avatar to feedback table
-- Run this once against your Supabase/Postgres database

-- 1. Add dot position columns (relative 0-1 within the element)
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS dot_position_x double precision NULL,
  ADD COLUMN IF NOT EXISTS dot_position_y double precision NULL;

-- 2. Add user avatar column
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS user_avatar text NULL;

-- 3. Function: auto-populate user_avatar from user_profiles_v2 on insert
CREATE OR REPLACE FUNCTION public.set_feedback_avatar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only set if user_avatar was not provided
  IF NEW.user_avatar IS NULL AND NEW.useremail IS NOT NULL THEN
    SELECT profile_img INTO NEW.user_avatar
    FROM public.user_profiles_v2
    WHERE email = NEW.useremail
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger: runs BEFORE INSERT so it can modify the row
DROP TRIGGER IF EXISTS set_feedback_avatar_trigger ON public.feedback;

CREATE TRIGGER set_feedback_avatar_trigger
  BEFORE INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_feedback_avatar();

-- 5. Backfill avatar for existing feedback rows
UPDATE public.feedback f
SET user_avatar = u.profile_img
FROM public.user_profiles_v2 u
WHERE f.useremail = u.email
  AND f.user_avatar IS NULL
  AND u.profile_img IS NOT NULL;
