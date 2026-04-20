-- Track SOL transfers for wallet transaction history.

CREATE TABLE IF NOT EXISTS public.sol_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_wallet TEXT NOT NULL,
  receiver_wallet TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports >= 0),
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sol_transfers_sender_wallet_idx ON public.sol_transfers (sender_wallet);
CREATE INDEX IF NOT EXISTS sol_transfers_receiver_wallet_idx ON public.sol_transfers (receiver_wallet);
CREATE INDEX IF NOT EXISTS sol_transfers_created_at_idx ON public.sol_transfers (created_at DESC);