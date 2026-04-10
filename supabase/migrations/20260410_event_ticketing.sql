-- Event and ticketing tables for Candy Machine-backed BlockTix flows.

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candy_machine_id TEXT,
  organizer_uid TEXT NOT NULL REFERENCES public.users(uid),
  name TEXT NOT NULL,
  venue TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  image_url TEXT,
  metadata_uri TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  total_supply INTEGER NOT NULL CHECK (total_supply > 0),
  price_lamports BIGINT NOT NULL CHECK (price_lamports >= 0),
  minted_count INTEGER NOT NULL DEFAULT 0 CHECK (minted_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS events_candy_machine_id_unique
  ON public.events (candy_machine_id)
  WHERE candy_machine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_organizer_uid_idx ON public.events (organizer_uid);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);
CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events (event_date);

CREATE TABLE IF NOT EXISTS public.ticket_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  candy_machine_id TEXT,
  buyer_wallet TEXT NOT NULL,
  ticket_mint TEXT NOT NULL,
  price_lamports BIGINT NOT NULL CHECK (price_lamports >= 0),
  minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_mint)
);

CREATE INDEX IF NOT EXISTS ticket_sales_event_id_idx ON public.ticket_sales (event_id);
CREATE INDEX IF NOT EXISTS ticket_sales_buyer_wallet_idx ON public.ticket_sales (buyer_wallet);
CREATE INDEX IF NOT EXISTS ticket_sales_candy_machine_id_idx ON public.ticket_sales (candy_machine_id);

CREATE TABLE IF NOT EXISTS public.event_allowlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS event_allowlists_event_id_idx ON public.event_allowlists (event_id);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
