export const AUCTIONS_TABLE = "auctions";
export const AUCTION_ACTIVITY_TABLE = "auction_activity";

export const AUCTION_SELECT =
  "id, auction_address, seed, organizer_uid, maker_wallet, event_id, title, description, image_url, nft_mint, bid_mint, end_time, status, highest_bidder, highest_bid_amount, resolved, create_signature, resolve_signature, cancel_signature, resolved_at, cancelled_at, created_at, updated_at";

export type AuctionStatus = "active" | "resolved" | "cancelled";

export type OrganizerAuction = {
  id: string;
  auctionAddress: string;
  seed: number;
  organizerUid: string;
  makerWallet: string;
  eventId: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  nftMint: string;
  bidMint: string;
  endTime: string;
  status: AuctionStatus;
  highestBidder: string | null;
  highestBidAmount: number;
  resolved: boolean;
  createSignature: string | null;
  resolveSignature: string | null;
  cancelSignature: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuctionActivityAction =
  | "create"
  | "bid"
  | "resolve"
  | "refund"
  | "cancel";

export type AuctionActivity = {
  id: string;
  auctionId: string;
  actionType: AuctionActivityAction;
  actorUid: string | null;
  actorWallet: string | null;
  amount: number | null;
  signature: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export const normalizeAuction = (row: {
  id: string;
  auction_address: string;
  seed: number;
  organizer_uid: string;
  maker_wallet: string;
  event_id: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  nft_mint: string;
  bid_mint: string;
  end_time: string;
  status: AuctionStatus;
  highest_bidder: string | null;
  highest_bid_amount: number;
  resolved: boolean;
  create_signature: string | null;
  resolve_signature: string | null;
  cancel_signature: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}): OrganizerAuction => ({
  id: row.id,
  auctionAddress: row.auction_address,
  seed: row.seed,
  organizerUid: row.organizer_uid,
  makerWallet: row.maker_wallet,
  eventId: row.event_id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  nftMint: row.nft_mint,
  bidMint: row.bid_mint,
  endTime: row.end_time,
  status: row.status,
  highestBidder: row.highest_bidder,
  highestBidAmount: row.highest_bid_amount,
  resolved: row.resolved,
  createSignature: row.create_signature,
  resolveSignature: row.resolve_signature,
  cancelSignature: row.cancel_signature,
  resolvedAt: row.resolved_at,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const normalizeAuctionActivity = (row: {
  id: string;
  auction_id: string;
  action_type: AuctionActivityAction;
  actor_uid: string | null;
  actor_wallet: string | null;
  amount: number | null;
  signature: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): AuctionActivity => ({
  id: row.id,
  auctionId: row.auction_id,
  actionType: row.action_type,
  actorUid: row.actor_uid,
  actorWallet: row.actor_wallet,
  amount: row.amount,
  signature: row.signature,
  metadata: row.metadata ?? {},
  createdAt: row.created_at,
});
