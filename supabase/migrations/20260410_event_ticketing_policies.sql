-- RLS policies for Dynamic-auth-based client writes.
--
-- Since this app currently uses Dynamic for identity (not Supabase Auth JWT sessions),
-- browser requests hit Postgres as anon/authenticated roles without a stable auth.uid().
-- These policies allow required event/ticket flows while keeping basic table constraints.

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_allowlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_policy ON public.events;
DROP POLICY IF EXISTS events_insert_policy ON public.events;
DROP POLICY IF EXISTS events_update_policy ON public.events;

DROP POLICY IF EXISTS ticket_sales_select_policy ON public.ticket_sales;
DROP POLICY IF EXISTS ticket_sales_insert_policy ON public.ticket_sales;

DROP POLICY IF EXISTS event_allowlists_select_policy ON public.event_allowlists;
DROP POLICY IF EXISTS event_allowlists_insert_policy ON public.event_allowlists;
DROP POLICY IF EXISTS event_allowlists_delete_policy ON public.event_allowlists;

-- Events are visible to all app users (needed for user dashboard listings).
CREATE POLICY events_select_policy
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow organizer dashboard to create draft/live rows.
-- NOTE: organizer identity is validated at app layer via Dynamic user profile checks.
CREATE POLICY events_insert_policy
  ON public.events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow organizer flow to mark events live and update minted_count.
CREATE POLICY events_update_policy
  ON public.events
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Ticket sales are needed for user purchase history and organizer analytics.
CREATE POLICY ticket_sales_select_policy
  ON public.ticket_sales
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY ticket_sales_insert_policy
  ON public.ticket_sales
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allowlists are used by organizer tooling and mint validation helpers.
CREATE POLICY event_allowlists_select_policy
  ON public.event_allowlists
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY event_allowlists_insert_policy
  ON public.event_allowlists
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY event_allowlists_delete_policy
  ON public.event_allowlists
  FOR DELETE
  TO anon, authenticated
  USING (true);
