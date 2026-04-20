import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import { createTableGuard } from "@/lib/supabase/table-guard";

const SOL_TRANSFERS_TABLE = "sol_transfers";

const solTransfersTableGuard = createTableGuard(SOL_TRANSFERS_TABLE);

export type SolTransfer = {
  id: string;
  senderWallet: string;
  receiverWallet: string;
  amountLamports: number;
  signature: string | null;
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
};

export type WalletHistoryItem = {
  id: string;
  type: "transfer" | "ticket" | "auction";
  action: "send" | "receive" | "mint" | "bid" | "win" | "refund" | "cancel";
  amount: number;
  counterparty: string | null;
  details: {
    eventName?: string;
    auctionTitle?: string;
    signature?: string;
  };
  createdAt: string;
};

const callApi = async <T>(
  path: string,
  options: RequestInit,
  dynamicUserId: string
): Promise<{ data: T | null; error: string | null }> => {
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

export const fetchSolTransfers = async (
  walletAddress: string
): Promise<SolTransfer[]> => {
  if (solTransfersTableGuard.isTableMissing()) {
    return [];
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(SOL_TRANSFERS_TABLE)
    .select("id, sender_wallet, receiver_wallet, amount_lamports, signature, status, created_at")
    .or(`sender_wallet.eq.${walletAddress},receiver_wallet.eq.${walletAddress}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (solTransfersTableGuard.isMissingTableError(error.message)) {
      solTransfersTableGuard.markTableMissing();
    }
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    sender_wallet: string;
    receiver_wallet: string;
    amount_lamports: number;
    signature: string | null;
    status: string;
    created_at: string;
  }) => ({
    id: row.id,
    senderWallet: row.sender_wallet,
    receiverWallet: row.receiver_wallet,
    amountLamports: row.amount_lamports,
    signature: row.signature,
    status: row.status as SolTransfer["status"],
    createdAt: row.created_at,
  }));
};

export const recordSolTransfer = async ({
  dynamicUserId,
  senderWallet,
  receiverWallet,
  amountLamports,
  signature,
}: {
  dynamicUserId: string;
  senderWallet: string;
  receiverWallet: string;
  amountLamports: number;
  signature?: string;
}): Promise<{ error: string | null }> => {
  if (solTransfersTableGuard.isTableMissing()) {
    return { error: "Transfers table not available." };
  }

  const result = await callApi<{ ok: true }>(
    "/api/wallet/transfer",
    {
      method: "POST",
      body: JSON.stringify({
        dynamicUserId,
        senderWallet,
        receiverWallet,
        amountLamports,
        signature,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export const buildWalletHistory = async (
  walletAddress: string
): Promise<WalletHistoryItem[]> => {
  const history: WalletHistoryItem[] = [];

  const transfers = await fetchSolTransfers(walletAddress);

  for (const transfer of transfers) {
    const isSend = transfer.senderWallet.toLowerCase() === walletAddress.toLowerCase();
    history.push({
      id: transfer.id,
      type: "transfer",
      action: isSend ? "send" : "receive",
      amount: transfer.amountLamports,
      counterparty: isSend ? transfer.receiverWallet : transfer.senderWallet,
      details: {
        signature: transfer.signature ?? undefined,
      },
      createdAt: transfer.createdAt,
    });
  }

  history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return history;
};