-- Minimal off-chain linkage for on-chain auction state.

CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_address TEXT NOT NULL UNIQUE,
  seed BIGINT NOT NULL CHECK (seed >= 0),
  organizer_uid TEXT NOT NULL REFERENCES public.users(uid),
  maker_wallet TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  nft_mint TEXT NOT NULL,
  bid_mint TEXT NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  highest_bidder TEXT,
  highest_bid_amount BIGINT NOT NULL DEFAULT 0 CHECK (highest_bid_amount >= 0),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  create_signature TEXT,
  resolve_signature TEXT,
  cancel_signature TEXT,
  resolved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auctions_organizer_uid_idx ON public.auctions (organizer_uid);
CREATE INDEX IF NOT EXISTS auctions_event_id_idx ON public.auctions (event_id);
CREATE INDEX IF NOT EXISTS auctions_status_idx ON public.auctions (status);
CREATE INDEX IF NOT EXISTS auctions_end_time_idx ON public.auctions (end_time);

CREATE TABLE IF NOT EXISTS public.auction_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'bid', 'resolve', 'refund', 'cancel')),
  actor_uid TEXT REFERENCES public.users(uid),
  actor_wallet TEXT,
  amount BIGINT CHECK (amount >= 0),
  signature TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auction_activity_auction_id_idx ON public.auction_activity (auction_id);
CREATE INDEX IF NOT EXISTS auction_activity_action_type_idx ON public.auction_activity (action_type);
CREATE INDEX IF NOT EXISTS auction_activity_created_at_idx ON public.auction_activity (created_at DESC);

DROP TRIGGER IF EXISTS auctions_set_updated_at ON public.auctions;
CREATE TRIGGER auctions_set_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
