-- Fix: "stack depth limit exceeded" caused by circular RLS dependency.
--
-- fn_current_role() queries users_profile, but users_profile's SELECT policy
-- calls fn_is_admin()/fn_can_manage_finance() which call fn_current_role(),
-- creating infinite recursion.
--
-- Solution: make fn_current_role() a SECURITY DEFINER function so it
-- bypasses RLS when reading the role from users_profile.

create or replace function public.fn_current_role()
returns user_role
language sql
stable
security definer
as $$
  select role from public.users_profile where id = auth.uid()
$$;
