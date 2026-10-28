-- MFA enforcement in the database (rollout step C). NOT part of schema.sql on purpose:
-- apply it only after every active user has set up an authenticator, because from then
-- on any session that has not passed the authenticator check (JWT claim aal = 'aal2')
-- is refused all data, including old cached copies of the app that know nothing about MFA.
--
-- 1. PRECHECK (read-only). These active users have no verified authenticator and would lose
--    access to their data until they have set one up:
--
--      select u.email, p.username, p.role
--      from auth.users u
--      join public.profiles p on p.id = u.id
--      where not p.disabled
--        and not exists (
--          select 1 from auth.mfa_factors f
--          where f.user_id = u.id and f.status = 'verified');
--
-- 2. Apply this file.
-- 3. Switch on the check in the admin edge function: set the function secret REQUIRE_AAL2=true.
--
-- Roll back (if somebody is locked out): drop the five "require aal2" policies below.
--
-- One RESTRICTIVE policy per table: restrictive policies are AND-ed with the existing
-- permissive ones, so everything that was allowed before still needs aal2 on top.
-- The edge function uses the service role and is not affected (it checks aal itself).

create policy "require aal2" on public.profiles
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "require aal2" on public.customers
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "require aal2" on public.session_types
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "require aal2" on public.time_entries
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "require aal2" on public.report_templates
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');
