import {
  AccountRole,
  type Address,
  type Instruction,
  type ReadonlyUint8Array,
  type TransactionSigner,
} from "@solana/kit";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import {
  getRpcEndpoint,
  getSolanaWalletAdapterFromDynamicWallet,
} from "@/lib/solana/candy-machine";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

type DynamicWalletLike = Parameters<typeof getSolanaWalletAdapterFromDynamicWallet>[0];

type KitInstruction = Instruction<string> & {
  accounts: Array<{ address: Address; role: AccountRole }>;
  data: ReadonlyUint8Array;
  programAddress: Address;
};

export type AuctionTxResult = {
  signature: string;
  simulationLogs: string[];
  unitsConsumed: number | null;
};

export const toAuctionInstructionSigner = (
  address: string
): TransactionSigner => {
  return {
    address: address as Address,
    signTransactions: async () => {
      throw new Error("Instruction-only signer cannot sign transactions directly.");
    },
  } as TransactionSigner;
};

const toWeb3AccountMeta = (account: {
  address: Address;
  role: AccountRole;
}): AccountMeta => {
  const isSigner =
    account.role === AccountRole.READONLY_SIGNER ||
    account.role === AccountRole.WRITABLE_SIGNER;
  const isWritable =
    account.role === AccountRole.WRITABLE ||
    account.role === AccountRole.WRITABLE_SIGNER;

  return {
    pubkey: new PublicKey(account.address),
    isSigner,
    isWritable,
  };
};

export const toWeb3TransactionInstruction = (
  instruction: KitInstruction
): TransactionInstruction => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress as string),
    keys: instruction.accounts.map(toWeb3AccountMeta),
    data: Buffer.from(Uint8Array.from(instruction.data)),
  });
};

export const deriveAssociatedTokenAddress = (
  ownerAddress: string,
  mintAddress: string,
  tokenProgramId = TOKEN_PROGRAM_ID
): string => {
  const [address] = PublicKey.findProgramAddressSync(
    [
      new PublicKey(ownerAddress).toBuffer(),
      tokenProgramId.toBuffer(),
      new PublicKey(mintAddress).toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return address.toBase58();
};

export const sendAuctionInstructionWithSimulation = async ({
  instruction,
  wallet,
  rpcEndpoint,
}: {
  instruction: KitInstruction;
  wallet: DynamicWalletLike;
  rpcEndpoint?: string;
}): Promise<AuctionTxResult> => {
  const walletAdapter = await getSolanaWalletAdapterFromDynamicWallet(wallet);
  if (!walletAdapter?.publicKey || !walletAdapter.signTransaction) {
    throw new Error("Connect a signer-capable Solana wallet first.");
  }

  const connection = new Connection(rpcEndpoint ?? getRpcEndpoint(), "confirmed");
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: walletAdapter.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(toWeb3TransactionInstruction(instruction));

  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    const logs = simulation.value.logs ?? [];
    throw new Error(
      `Simulation failed: ${JSON.stringify(simulation.value.err)}${
        logs.length ? `\n${logs.join("\n")}` : ""
      }`
    );
  }

  const signed = await walletAdapter.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  return {
    signature,
    simulationLogs: simulation.value.logs ?? [],
    unitsConsumed: simulation.value.unitsConsumed ?? null,
  };
};
