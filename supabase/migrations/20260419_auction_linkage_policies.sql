-- RLS read policies for auction tables.
-- Writes are server-mediated using supabase service role.

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auctions_select_policy ON public.auctions;
DROP POLICY IF EXISTS auction_activity_select_policy ON public.auction_activity;

CREATE POLICY auctions_select_policy
  ON public.auctions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY auction_activity_select_policy
  ON public.auction_activity
  FOR SELECT
  TO anon, authenticated
  USING (true);
