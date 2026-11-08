-- Diagnostic function to inspect JWT claims
create or replace function public.get_my_claims()
returns jsonb
language plpgsql
security invoker
as $$
begin
  return auth.jwt();
end;
$$;

-- Grant execution to authenticated and anon (for debugging)
grant execute on function public.get_my_claims() to authenticated;
grant execute on function public.get_my_claims() to anon;
