-- Grant EXECUTE on RLS helper functions to authenticated role
-- These SECURITY DEFINER functions are called by RLS policies on profiles/requests tables.
-- Without EXECUTE permission, authenticated users get 403 on every query that touches those policies.

GRANT EXECUTE ON FUNCTION public.is_hr() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_of(UUID) TO authenticated;
