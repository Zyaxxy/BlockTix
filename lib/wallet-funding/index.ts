import { getAuthToken } from "@dynamic-labs/sdk-react-core";

export type RequestAirdropInput = {
  dynamicUserId: string;
  walletAddress: string;
  amountInr: number;
};

export type AirdropResponseData = {
  signature: string;
  amountLamports: number;
  amountSol: number;
  amountInr: number;
};

export const requestDevnetAirdrop = async (
  input: RequestAirdropInput
): Promise<{ data: AirdropResponseData | null; error: string | null }> => {
  if (!input.dynamicUserId) {
    return { data: null, error: "Missing Dynamic user id." };
  }

  const authToken = getAuthToken();
  if (!authToken) {
    return { data: null, error: "Dynamic session expired. Please log in again." };
  }

  const response = await fetch("/api/wallet/airdrop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: AirdropResponseData; error?: string }
    | null;

  if (!response.ok) {
    return {
      data: null,
      error: payload?.error ?? "Airdrop request failed.",
    };
  }

  if (!payload?.data) {
    return { data: null, error: "Unexpected empty response payload." };
  }

  return { data: payload.data, error: null };
};
