-- Harden client-side access now that event/ticket writes are server-mediated.
--
-- Browser clients should retain read access for dashboards, but all INSERT/UPDATE/DELETE
-- operations are restricted to service-role server routes.

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_allowlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_insert_policy ON public.events;
DROP POLICY IF EXISTS events_update_policy ON public.events;

DROP POLICY IF EXISTS ticket_sales_insert_policy ON public.ticket_sales;

DROP POLICY IF EXISTS event_allowlists_insert_policy ON public.event_allowlists;
DROP POLICY IF EXISTS event_allowlists_delete_policy ON public.event_allowlists;
