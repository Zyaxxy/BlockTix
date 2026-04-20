import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcEndpoint } from "@/lib/solana/candy-machine";

const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export type WalletTokenMint = {
  mint: string;
  amountRaw: string;
  decimals: number;
  amountUi: number;
};

type TokenAggregation = {
  amountRaw: bigint;
  decimals: number;
};

const toUiAmount = (amountRaw: bigint, decimals: number): number => {
  const divisor = 10 ** Math.max(decimals, 0);
  if (!Number.isFinite(divisor) || divisor <= 0) {
    return 0;
  }

  return Number(amountRaw) / divisor;
};

export const fetchWalletTokenMints = async (
  walletAddress: string,
  rpcEndpoint = getRpcEndpoint()
): Promise<WalletTokenMint[]> => {
  if (!walletAddress?.trim()) {
    return [];
  }

  const connection = new Connection(rpcEndpoint, "confirmed");
  const owner = new PublicKey(walletAddress);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { programId: SPL_TOKEN_PROGRAM_ID },
    "confirmed"
  );

  const byMint = new Map<string, TokenAggregation>();

  for (const account of tokenAccounts.value) {
    const parsed = (account.account.data as { parsed?: { info?: unknown } }).parsed;
    const info = parsed?.info as
      | {
          mint?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
          };
        }
      | undefined;

    const mint = info?.mint;
    const amountText = info?.tokenAmount?.amount;
    const decimals = Number(info?.tokenAmount?.decimals ?? 0);

    if (!mint || !amountText) {
      continue;
    }

    let amountRaw = 0n;
    try {
      amountRaw = BigInt(amountText);
    } catch {
      continue;
    }

    if (amountRaw <= 0n) {
      continue;
    }

    const existing = byMint.get(mint);
    if (existing) {
      existing.amountRaw += amountRaw;
    } else {
      byMint.set(mint, {
        amountRaw,
        decimals,
      });
    }
  }

  const result: WalletTokenMint[] = [];

  for (const [mint, value] of byMint.entries()) {
    result.push({
      mint,
      amountRaw: value.amountRaw.toString(),
      decimals: value.decimals,
      amountUi: toUiAmount(value.amountRaw, value.decimals),
    });
  }

  result.sort((left, right) => {
    if (right.amountUi !== left.amountUi) {
      return right.amountUi - left.amountUi;
    }

    return left.mint.localeCompare(right.mint);
  });

  return result;
};

export const fetchWalletNftMints = async (
  walletAddress: string,
  rpcEndpoint = getRpcEndpoint()
): Promise<WalletTokenMint[]> => {
  const tokenMints = await fetchWalletTokenMints(walletAddress, rpcEndpoint);
  return tokenMints.filter((tokenMint) => tokenMint.decimals === 0 && tokenMint.amountRaw === "1");
};
