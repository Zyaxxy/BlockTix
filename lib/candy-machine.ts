import {
  create,
  fetchCandyMachine,
  mintV2,
  mplCandyMachine,
  safeFetchCandyMachine,
  type CandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  createNft,
  findMasterEditionPda,
  findMetadataPda,
  mplTokenMetadata,
  safeFetchMasterEdition,
  safeFetchMetadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  base58,
  generateSigner,
  lamports,
  none,
  percentAmount,
  publicKey,
  type PublicKey,
  type Umi,
} from "@metaplex-foundation/umi";
import {
  walletAdapterIdentity,
  type WalletAdapter,
} from "@metaplex-foundation/umi-signer-wallet-adapters";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  PublicKey as Web3JsPublicKey,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";

const DEFAULT_DEVNET_RPC = "https://api.devnet.solana.com";

export type TicketMetadataInput = {
  name: string;
  description: string;
  imageUri: string;
  symbol?: string;
  externalUrl?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
};

export type CandyMachineSummary = {
  address: string;
  itemsAvailable: number;
  itemsRedeemed: number;
  collectionMint: string;
  authority: string;
  mintAuthority: string;
};

type DynamicWalletLike = {
  address?: string;
  connector?: {
    signTransaction?: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
    signAllTransactions?: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
    signMessage?: (
      message: Uint8Array
    ) => Promise<Uint8Array | { signature?: Uint8Array | ArrayBuffer | ArrayBufferView | number[] } | ArrayBuffer | ArrayBufferView | number[]>;
    getSigner?: () => Promise<{
      signTransaction?: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
      signAllTransactions?: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
      signMessage?: (
        message: Uint8Array
      ) => Promise<Uint8Array | { signature?: Uint8Array | ArrayBuffer | ArrayBufferView | number[] } | ArrayBuffer | ArrayBufferView | number[]>;
    }>;
  };
};

const normalizeBytes = (
  value: Uint8Array | { signature?: Uint8Array | ArrayBuffer | ArrayBufferView | number[] } | ArrayBuffer | ArrayBufferView | number[]
): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (value && typeof value === "object" && "signature" in value && value.signature) {
    return normalizeBytes(value.signature);
  }

  throw new Error("Wallet signMessage returned an unsupported payload type.");
};

export type DeployCandyMachineInput = {
  walletAdapter: WalletAdapter;
  eventName: string;
  symbol: string;
  metadataUri: string;
  deployAttemptId?: string;
  eventId?: string;
  totalSupply: number;
  priceLamports: number;
  mintLimitPerWallet?: number;
  saleStartsAt?: string | Date;
  saleEndsAt?: string | Date;
  botTaxLamports?: number;
};

export type DeployCandyMachineResult = {
  candyMachineAddress: string;
  collectionMintAddress: string;
  collectionCreateSignature: string;
  candyMachineCreateSignature: string;
};

export type MintTicketInput = {
  walletAdapter: WalletAdapter;
  candyMachineAddress: string;
  collectionMintAddress: string;
  collectionUpdateAuthorityAddress: string;
};

export const getRpcEndpoint = () => {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_DEVNET_RPC;
};

export const createCandyMachineClient = (
  walletAdapter: WalletAdapter,
  rpcEndpoint = getRpcEndpoint()
): Umi => {
  return createUmi(rpcEndpoint)
    .use(mplCandyMachine())
    .use(mplTokenMetadata())
    .use(walletAdapterIdentity(walletAdapter))
    .use(irysUploader());
};

export const getSolanaWalletAdapterFromDynamicWallet = async (
  wallet: DynamicWalletLike | null | undefined
): Promise<WalletAdapter | null> => {
  const address = wallet?.address;
  const connector = wallet?.connector;

  if (!address || !connector) {
    return null;
  }

  let signer: {
    signTransaction?: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
    signAllTransactions?: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
    signMessage?: (
      message: Uint8Array
    ) => Promise<Uint8Array | { signature?: Uint8Array | ArrayBuffer | ArrayBufferView | number[] } | ArrayBuffer | ArrayBufferView | number[]>;
  } | undefined;

  if (connector.signTransaction) {
    signer = connector;
  } else {
    try {
      signer = await connector.getSigner?.();
    } catch {
      return null;
    }
  }

  if (!signer?.signTransaction) {
    return null;
  }

  const signTransaction = async <T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> => {
    return signer.signTransaction!(transaction);
  };

  const signAllTransactions = signer.signAllTransactions
    ? async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
        return signer.signAllTransactions!(transactions);
      }
    : undefined;

  const signMessage = signer.signMessage
    ? async (message: Uint8Array): Promise<Uint8Array> => {
        const signed = await signer.signMessage!(message);
        return normalizeBytes(signed);
      }
    : undefined;

  return {
    publicKey: new Web3JsPublicKey(address),
    signTransaction,
    signAllTransactions,
    signMessage,
  };
};

export const uploadTicketMetadataJson = async (
  umi: Umi,
  input: TicketMetadataInput
): Promise<string> => {
  return umi.uploader.uploadJson({
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    image: input.imageUri,
    external_url: input.externalUrl,
    attributes: input.attributes,
    properties: {
      files: [{ uri: input.imageUri, type: "image/png" }],
      category: "image",
    },
  });
};

const mapCandyMachineSummary = (
  address: PublicKey,
  candyMachine: CandyMachine
): CandyMachineSummary => ({
  address: address.toString(),
  itemsAvailable: Number(candyMachine.data.itemsAvailable),
  itemsRedeemed: Number(candyMachine.itemsRedeemed),
  collectionMint: candyMachine.collectionMint.toString(),
  authority: candyMachine.authority.toString(),
  mintAuthority: candyMachine.mintAuthority.toString(),
});

export const fetchCandyMachineSummary = async (
  umi: Umi,
  candyMachineAddress: string
): Promise<CandyMachineSummary | null> => {
  const address = publicKey(candyMachineAddress);
  const data = await safeFetchCandyMachine(umi, address);

  if (!data) {
    return null;
  }

  return mapCandyMachineSummary(address, data);
};

export const requireCandyMachineSummary = async (
  umi: Umi,
  candyMachineAddress: string
): Promise<CandyMachineSummary> => {
  const address = publicKey(candyMachineAddress);
  const data = await fetchCandyMachine(umi, address);
  return mapCandyMachineSummary(address, data);
};

const normalizeDate = (value?: string | Date) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return date;
};

const delay = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const toBase58Signature = (signature: unknown): string => {
  if (typeof signature === "string") {
    return signature;
  }

  if (signature instanceof Uint8Array) {
    return base58.deserialize(signature)[0];
  }

  if (Array.isArray(signature) && signature.every((value) => Number.isInteger(value))) {
    return base58.deserialize(Uint8Array.from(signature))[0];
  }

  return String(signature);
};

const assertTransactionConfirmed = (
  stage: string,
  signature: string,
  result: unknown
) => {
  const txError =
    (result as { value?: { err?: unknown } } | undefined)?.value?.err ?? null;

  if (txError) {
    throw new Error(
      `${stage} transaction failed. signature=${signature} err=${JSON.stringify(txError)}`
    );
  }
};

const assertCollectionNftAccounts = async (
  umi: Umi,
  collectionMint: PublicKey,
  collectionMetadata: ReturnType<typeof findMetadataPda>,
  collectionMasterEdition: ReturnType<typeof findMasterEditionPda>
) => {
  const maxAttempts = 20;
  const retryDelayMs = 500;
  const mplTokenMetadataProgram = umi.programs.getPublicKey(
    "mplTokenMetadata",
    publicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
  );

  let lastStatus = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const [
      collectionMintFinalizedRaw,
      metadataFinalizedRaw,
      masterEditionFinalizedRaw,
      collectionMintConfirmedRaw,
      metadataConfirmedRaw,
      masterEditionConfirmedRaw,
      metadataAccount,
      masterEditionAccount,
    ] =
      await Promise.all([
        umi.rpc.getAccount(collectionMint, { commitment: "finalized" }),
        umi.rpc.getAccount(collectionMetadata[0], { commitment: "finalized" }),
        umi.rpc.getAccount(collectionMasterEdition[0], { commitment: "finalized" }),
        umi.rpc.getAccount(collectionMint, { commitment: "confirmed" }),
        umi.rpc.getAccount(collectionMetadata[0], { commitment: "confirmed" }),
        umi.rpc.getAccount(collectionMasterEdition[0], { commitment: "confirmed" }),
        safeFetchMetadata(umi, collectionMetadata, { commitment: "confirmed" }),
        safeFetchMasterEdition(umi, collectionMasterEdition, { commitment: "confirmed" }),
      ]);

    const metadataOwnerOk =
      metadataConfirmedRaw.exists &&
      metadataConfirmedRaw.owner.toString() === mplTokenMetadataProgram.toString();
    const masterEditionOwnerOk =
      masterEditionConfirmedRaw.exists &&
      masterEditionConfirmedRaw.owner.toString() === mplTokenMetadataProgram.toString();
    const collectionMintExists = collectionMintConfirmedRaw.exists;

    const rawOwnerCheckPassed =
      collectionMintExists && metadataOwnerOk && masterEditionOwnerOk;
    const typedCheckPassed = Boolean(metadataAccount && masterEditionAccount);

    if (rawOwnerCheckPassed && typedCheckPassed) {
      return;
    }

    lastStatus = JSON.stringify({
      attempt,
      rpc: umi.rpc.getEndpoint(),
      collectionMint: collectionMint.toString(),
      collectionMintExists: collectionMintConfirmedRaw.exists,
      collectionMintOwner: collectionMintConfirmedRaw.exists
        ? collectionMintConfirmedRaw.owner.toString()
        : null,
      collectionMintExistsFinalized: collectionMintFinalizedRaw.exists,
      metadataPda: collectionMetadata[0].toString(),
      metadataExists: metadataConfirmedRaw.exists,
      metadataOwner: metadataConfirmedRaw.exists
        ? metadataConfirmedRaw.owner.toString()
        : null,
      metadataExistsFinalized: metadataFinalizedRaw.exists,
      metadataDecoded: Boolean(metadataAccount),
      masterEditionPda: collectionMasterEdition[0].toString(),
      masterEditionExists: masterEditionConfirmedRaw.exists,
      masterEditionOwner: masterEditionConfirmedRaw.exists
        ? masterEditionConfirmedRaw.owner.toString()
        : null,
      masterEditionExistsFinalized: masterEditionFinalizedRaw.exists,
      masterEditionDecoded: Boolean(masterEditionAccount),
      expectedOwner: mplTokenMetadataProgram.toString(),
    });

    if (attempt < maxAttempts) {
      await delay(retryDelayMs);
    }
  }

  throw new Error(
    `Collection NFT metadata/master edition could not be validated for mpl-token-metadata after ${maxAttempts} attempts. Last status: ${lastStatus}`
  );
};

export const deployCandyMachineForEvent = async (
  input: DeployCandyMachineInput
): Promise<DeployCandyMachineResult> => {
  const umi = createCandyMachineClient(input.walletAdapter);
  const collectionMint = generateSigner(umi);
  const deployAttemptId = input.deployAttemptId ?? `deploy-${Date.now()}`;

  try {
    const collectionCreateResult = await createNft(umi, {
      mint: collectionMint,
      authority: umi.identity,
      updateAuthority: umi.identity.publicKey,
      name: `${input.eventName} Collection`,
      symbol: input.symbol,
      uri: input.metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      isCollection: true,
    }).sendAndConfirm(umi);
    const collectionCreateSignature = toBase58Signature(
      collectionCreateResult.signature
    );
    assertTransactionConfirmed(
      "collection_create",
      collectionCreateSignature,
      collectionCreateResult.result
    );

    const collectionMetadata = findMetadataPda(umi, {
      mint: collectionMint.publicKey,
    });
    const collectionMasterEdition = findMasterEditionPda(umi, {
      mint: collectionMint.publicKey,
    });
    await assertCollectionNftAccounts(
      umi,
      collectionMint.publicKey,
      collectionMetadata,
      collectionMasterEdition
    );

    const candyMachine = generateSigner(umi);
    const saleStart = normalizeDate(input.saleStartsAt);
    const saleEnd = normalizeDate(input.saleEndsAt);

    const candyMachineCreateResult = await (
      await create(umi, {
        candyMachine,
        collectionMint: collectionMint.publicKey,
        collectionMetadata,
        collectionMasterEdition,
        collectionUpdateAuthority: umi.identity,
        tokenStandard: TokenStandard.NonFungible,
        itemsAvailable: BigInt(input.totalSupply),
        sellerFeeBasisPoints: percentAmount(0),
        creators: [
          {
            address: umi.identity.publicKey,
            verified: true,
            percentageShare: 100,
          },
        ],
        configLineSettings: none(),
        hiddenSettings: {
          name: `${input.eventName} #`,
          uri: input.metadataUri,
          hash: new Uint8Array(32),
        },
        guards: {
          solPayment: {
            lamports: lamports(input.priceLamports),
            destination: umi.identity.publicKey,
          },
          mintLimit:
            input.mintLimitPerWallet && input.mintLimitPerWallet > 0
              ? {
                  id: 1,
                  limit: input.mintLimitPerWallet,
                }
              : undefined,
          startDate: saleStart ? { date: saleStart } : undefined,
          endDate: saleEnd ? { date: saleEnd } : undefined,
          botTax:
            input.botTaxLamports && input.botTaxLamports > 0
              ? {
                  lamports: lamports(input.botTaxLamports),
                  lastInstruction: true,
                }
              : undefined,
        },
      })
    ).sendAndConfirm(umi);
    const candyMachineCreateSignature = toBase58Signature(
      candyMachineCreateResult.signature
    );
    assertTransactionConfirmed(
      "candy_machine_initialize",
      candyMachineCreateSignature,
      candyMachineCreateResult.result
    );

    return {
      candyMachineAddress: candyMachine.publicKey.toString(),
      collectionMintAddress: collectionMint.publicKey.toString(),
      collectionCreateSignature,
      candyMachineCreateSignature,
    };
  } catch (error) {
    console.error(
      "[candy-machine-deploy]",
      JSON.stringify({
        stage: "deploy_failed",
        deployAttemptId,
        eventId: input.eventId ?? null,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    throw error;
  }
};

export const mintTicketFromCandyMachine = async (
  input: MintTicketInput
): Promise<{ ticketMintAddress: string }> => {
  const umi = createCandyMachineClient(input.walletAdapter);
  const nftMint = generateSigner(umi);

  await mintV2(umi, {
    candyMachine: publicKey(input.candyMachineAddress),
    collectionMint: publicKey(input.collectionMintAddress),
    collectionUpdateAuthority: publicKey(input.collectionUpdateAuthorityAddress),
    nftMint,
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  return {
    ticketMintAddress: nftMint.publicKey.toString(),
  };
};

export const solToLamports = (solAmount: number) => {
  if (!Number.isFinite(solAmount) || solAmount < 0) {
    throw new Error("SOL amount must be a non-negative finite number.");
  }

  return Math.round(solAmount * 1_000_000_000);
};
