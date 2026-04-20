import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcEndpoint } from "@/lib/solana/candy-machine";

export const fetchSolBalance = async (
  walletAddress: string,
  rpcEndpoint = getRpcEndpoint()
): Promise<number> => {
  if (!walletAddress?.trim()) {
    return 0;
  }

  try {
    const connection = new Connection(rpcEndpoint, "confirmed");
    const publicKey = new PublicKey(walletAddress);
    const lamports = await connection.getBalance(publicKey, "confirmed");
    return lamports / 1_000_000_000;
  } catch (error) {
    console.error("Failed to fetch SOL balance:", error);
    return 0;
  }
};