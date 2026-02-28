-- Run this in your Supabase SQL Editor to fix missing profiles for users created before the trigger was added.
-- It copies all existing users from the auth system into the public.profiles table.

INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  id, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
