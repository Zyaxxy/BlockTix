import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { getRpcEndpoint } from "@/lib/solana/candy-machine";
import { getSolanaWalletAdapterFromDynamicWallet, type DynamicWalletLike } from "./candy-machine";

export type TransferResult = {
  signature: string;
  amountSol: number;
  receiver: string;
};

export const buildTransferTransaction = async (
  fromAddress: string,
  toAddress: string,
  amountSol: number,
  rpcEndpoint = getRpcEndpoint()
): Promise<Transaction> => {
  const connection = new Connection(rpcEndpoint, "confirmed");
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);

  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const instruction: TransactionInstruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: fromPubkey,
  });

  transaction.add(instruction);

  return transaction;
};

export const sendSol = async (
  wallet: DynamicWalletLike,
  toAddress: string,
  amountSol: number,
  rpcEndpoint = getRpcEndpoint()
): Promise<TransferResult> => {
  const walletAdapter = await getSolanaWalletAdapterFromDynamicWallet(wallet);

  if (!walletAdapter?.publicKey || !walletAdapter.signTransaction) {
    throw new Error("Wallet does not support signing transactions");
  }

  if (!wallet.address) {
    throw new Error("Wallet address not available");
  }

  const transaction = await buildTransferTransaction(
    wallet.address,
    toAddress,
    amountSol,
    rpcEndpoint
  );

  const signedTransaction = await walletAdapter.signTransaction(transaction);

  const connection = new Connection(rpcEndpoint, "confirmed");
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction(signature, "confirmed");

  return {
    signature,
    amountSol,
    receiver: toAddress,
  };
};

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};