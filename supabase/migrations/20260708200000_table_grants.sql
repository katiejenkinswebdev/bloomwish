-- Explicit table-level grants for the API roles. Row-level security (already
-- enabled on every table) remains the actual authorization layer — these
-- grants only let the roles reach the tables at all. Some environments (seen
-- with the local CLI stack) don't apply the expected default privileges to
-- migration-created tables, which surfaces as
-- "42501 permission denied for table ..." despite correct RLS policies.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;
