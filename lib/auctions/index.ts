import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import { createTableGuard } from "@/lib/supabase/table-guard";
import {
  AUCTIONS_TABLE,
  AUCTION_ACTIVITY_TABLE,
  AUCTION_SELECT,
  normalizeAuction,
  normalizeAuctionActivity,
  type AuctionActivity,
  type AuctionStatus,
  type OrganizerAuction,
} from "./normalize-auction";

const MISSING_AUCTIONS_TABLE_ERROR =
  "Supabase table public.auctions is missing. Run the auction linkage migration and retry.";

const auctionTableGuard = createTableGuard(AUCTIONS_TABLE);

export type CreateAuctionInput = {
  dynamicUserId: string;
  creatorUid: string;
  makerWallet: string;
  auctionAddress: string;
  seed: number;
  nftMint: string;
  bidMint: string;
  endTime: string;
  eventId?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  createSignature?: string;
};

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

const callApi = async <T>(
  path: string,
  options: RequestInit,
  dynamicUserId: string
): Promise<ApiResult<T>> => {
  if (!dynamicUserId) {
    return { data: null, error: "Missing Dynamic user id." };
  }

  const authToken = getAuthToken();
  if (!authToken) {
    return { data: null, error: "Dynamic session expired. Please log in again." };
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...(options.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;

  if (!response.ok) {
    return {
      data: null,
      error: payload?.error ?? "Request failed.",
    };
  }

  if (!payload?.data) {
    return { data: null, error: "Unexpected empty response payload." };
  }

  return { data: payload.data, error: null };
};

export const fetchAuctions = async ({
  creatorUid,
  eventId,
  status,
}: {
  creatorUid?: string;
  eventId?: string;
  status?: AuctionStatus;
} = {}): Promise<OrganizerAuction[]> => {
  if (auctionTableGuard.isTableMissing()) {
    return [];
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  let query = supabase.from(AUCTIONS_TABLE).select(AUCTION_SELECT);

  if (creatorUid) {
    query = query.eq("organizer_uid", creatorUid);
  }

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    if (auctionTableGuard.isMissingTableError(error.message)) {
      auctionTableGuard.markTableMissing();
    }
    return [];
  }

  return (data ?? []).map(normalizeAuction);
};

export const fetchAuctionById = async (
  auctionId: string
): Promise<OrganizerAuction | null> => {
  if (!auctionId || auctionTableGuard.isTableMissing()) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(AUCTIONS_TABLE)
    .select(AUCTION_SELECT)
    .eq("id", auctionId)
    .maybeSingle();

  if (error) {
    if (auctionTableGuard.isMissingTableError(error.message)) {
      auctionTableGuard.markTableMissing();
    }
    return null;
  }

  return data ? normalizeAuction(data) : null;
};

export const fetchAuctionActivity = async (
  auctionId: string
): Promise<AuctionActivity[]> => {
  if (!auctionId || auctionTableGuard.isTableMissing()) {
    return [];
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(AUCTION_ACTIVITY_TABLE)
    .select("id, auction_id, action_type, actor_uid, actor_wallet, amount, signature, metadata, created_at")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return (data ?? []).map(normalizeAuctionActivity);
};

export const createAuction = async (
  input: CreateAuctionInput
): Promise<ApiResult<OrganizerAuction>> => {
  if (auctionTableGuard.isTableMissing()) {
    return { data: null, error: MISSING_AUCTIONS_TABLE_ERROR };
  }

  return callApi<OrganizerAuction>(
    "/api/auctions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    input.dynamicUserId
  );
};

export const recordAuctionBid = async ({
  dynamicUserId,
  auctionId,
  bidderWallet,
  signature,
  amount,
  highestBidAmount,
}: {
  dynamicUserId: string;
  auctionId: string;
  bidderWallet: string;
  signature?: string;
  amount: number;
  highestBidAmount?: number;
}): Promise<{ error: string | null }> => {
  const result = await callApi<{ ok: true }>(
    `/api/auctions/${auctionId}/bid`,
    {
      method: "POST",
      body: JSON.stringify({
        dynamicUserId,
        bidderWallet,
        signature,
        amount,
        highestBidAmount,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export const markAuctionResolved = async ({
  dynamicUserId,
  auctionId,
  resolveSignature,
  winnerWallet,
  highestBidAmount,
}: {
  dynamicUserId: string;
  auctionId: string;
  resolveSignature: string;
  winnerWallet?: string;
  highestBidAmount?: number;
}): Promise<{ error: string | null }> => {
  const result = await callApi<{ ok: true }>(
    `/api/auctions/${auctionId}/resolve`,
    {
      method: "POST",
      body: JSON.stringify({
        dynamicUserId,
        resolveSignature,
        winnerWallet,
        highestBidAmount,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export const markAuctionCancelled = async ({
  dynamicUserId,
  auctionId,
  cancelSignature,
}: {
  dynamicUserId: string;
  auctionId: string;
  cancelSignature: string;
}): Promise<{ error: string | null }> => {
  const result = await callApi<{ ok: true }>(
    `/api/auctions/${auctionId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({
        dynamicUserId,
        cancelSignature,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export const markAuctionRefunded = async ({
  dynamicUserId,
  auctionId,
  bidderWallet,
  refundSignature,
  amount,
}: {
  dynamicUserId: string;
  auctionId: string;
  bidderWallet: string;
  refundSignature: string;
  amount?: number;
}): Promise<{ error: string | null }> => {
  const result = await callApi<{ ok: true }>(
    `/api/auctions/${auctionId}/refund`,
    {
      method: "POST",
      body: JSON.stringify({
        dynamicUserId,
        bidderWallet,
        refundSignature,
        amount,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export {
  AUCTIONS_TABLE,
  AUCTION_ACTIVITY_TABLE,
  AUCTION_SELECT,
  normalizeAuction,
  normalizeAuctionActivity,
} from "./normalize-auction";

export type { AuctionStatus, OrganizerAuction, AuctionActivity } from "./normalize-auction";
