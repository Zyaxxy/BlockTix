import {
  create,
  findCandyGuardPda,
  mintV2,
  mplCandyMachine,
  safeFetchCandyGuard,
  safeFetchCandyMachine,
  type DefaultGuardSetMintArgs,
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
  isSome,
  none,
  percentAmount,
  publicKey,
  some,
  transactionBuilder,
  type PublicKey,
  type Umi,
} from "@metaplex-foundation/umi";
import {
  walletAdapterIdentity,
  type WalletAdapter,
} from "@metaplex-foundation/umi-signer-wallet-adapters";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  Connection,
  ComputeBudgetProgram,
  PublicKey as Web3JsPublicKey,
  type TransactionInstruction,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";

const DEFAULT_DEVNET_RPC = "https://api.devnet.solana.com";
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

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
    getActiveAccountAddress?: () => Promise<string | undefined>;
    setActiveAccountAddress?: (address: string) => void | Promise<void>;
    getWalletClientByAddress?: (input: { accountAddress: string }) => unknown;
    validateActiveWallet?: (expectedAddress: string) => Promise<void>;
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

type GuardSelectionResult = {
  mintArgs: Partial<DefaultGuardSetMintArgs>;
  group: string | null;
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

  const ensureActiveAccountAddress = async () => {
    try {
      const currentActiveAddress = await connector.getActiveAccountAddress?.();
      if (currentActiveAddress?.toLowerCase() === address.toLowerCase()) {
        return;
      }
    } catch {
      // Continue with fallback synchronization strategies.
    }

    try {
      await connector.setActiveAccountAddress?.(address);
    } catch {
      // Continue with fallback synchronization strategies.
    }

    try {
      connector.getWalletClientByAddress?.({ accountAddress: address });
    } catch {
      // Best effort; some connectors don't expose this.
    }

    try {
      await connector.validateActiveWallet?.(address);
    } catch {
      // Best effort; not all connectors expose this and some throw until first sign attempt.
    }
  };

  await ensureActiveAccountAddress();

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
    await ensureActiveAccountAddress();
    return signer.signTransaction!(transaction);
  };

  const signAllTransactions = signer.signAllTransactions
    ? async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
        await ensureActiveAccountAddress();
        return signer.signAllTransactions!(transactions);
      }
    : undefined;

  const signMessage = signer.signMessage
    ? async (message: Uint8Array): Promise<Uint8Array> => {
        await ensureActiveAccountAddress();
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

const toUmiWrappedInstruction = (instruction: TransactionInstruction) => ({
  instruction: {
    programId: publicKey(instruction.programId.toBase58()),
    keys: instruction.keys.map((key) => ({
      pubkey: publicKey(key.pubkey.toBase58()),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: new Uint8Array(instruction.data),
  },
  signers: [],
  bytesCreatedOnChain: 0,
});

const extractInsufficientLamports = (logs: string[]) => {
  for (const line of logs) {
    const match = line.match(/insufficient lamports\s+(\d+),\s+need\s+(\d+)/i);
    if (!match) {
      continue;
    }

    const currentLamports = Number(match[1]);
    const neededLamports = Number(match[2]);

    if (!Number.isFinite(currentLamports) || !Number.isFinite(neededLamports)) {
      continue;
    }

    return {
      currentLamports,
      neededLamports,
      shortfallLamports: Math.max(0, neededLamports - currentLamports),
    };
  }

  return null;
};

const resolveGuardSelection = (
  candyGuard: NonNullable<Awaited<ReturnType<typeof safeFetchCandyGuard>>>
): GuardSelectionResult => {
  const candidates: Array<{ label: string | null; guards: typeof candyGuard.guards }> = [
    { label: null, guards: candyGuard.guards },
    ...candyGuard.groups.map((group) => ({ label: group.label, guards: group.guards })),
  ];

  const candidateFailures: string[] = [];

  for (const candidate of candidates) {
    const { guards } = candidate;
    const mintArgs: Partial<DefaultGuardSetMintArgs> = {};
    const unsupportedGuards: string[] = [];

    if (isSome(guards.mintLimit)) {
      const mintLimitValue = guards.mintLimit.value as { id: number };
      mintArgs.mintLimit = { id: mintLimitValue.id };
    }

    if (isSome(guards.allocation)) {
      const allocationValue = guards.allocation.value as { id: number };
      mintArgs.allocation = { id: allocationValue.id };
    }

    if (isSome(guards.solPayment)) {
      const solPaymentValue = guards.solPayment.value as { destination: PublicKey };
      mintArgs.solPayment = {
        destination: solPaymentValue.destination,
      };
    }

    if (isSome(guards.tokenPayment)) {
      const tokenPaymentValue = guards.tokenPayment.value as {
        mint: PublicKey;
        destinationAta: PublicKey;
      };
      mintArgs.tokenPayment = {
        mint: tokenPaymentValue.mint,
        destinationAta: tokenPaymentValue.destinationAta,
      };
    }

    if (isSome(guards.token2022Payment)) {
      const token2022PaymentValue = guards.token2022Payment.value as {
        mint: PublicKey;
        destinationAta: PublicKey;
      };
      mintArgs.token2022Payment = {
        mint: token2022PaymentValue.mint,
        destinationAta: token2022PaymentValue.destinationAta,
      };
    }

    if (isSome(guards.tokenGate)) {
      const tokenGateValue = guards.tokenGate.value as { mint: PublicKey };
      mintArgs.tokenGate = {
        mint: tokenGateValue.mint,
      };
    }

    if (isSome(guards.tokenBurn)) {
      const tokenBurnValue = guards.tokenBurn.value as { mint: PublicKey };
      mintArgs.tokenBurn = {
        mint: tokenBurnValue.mint,
      };
    }

    if (isSome(guards.freezeSolPayment)) {
      const freezeSolPaymentValue = guards.freezeSolPayment.value as {
        destination: PublicKey;
      };
      mintArgs.freezeSolPayment = {
        destination: freezeSolPaymentValue.destination,
      };
    }

    if (isSome(guards.freezeTokenPayment)) {
      const freezeTokenPaymentValue = guards.freezeTokenPayment.value as {
        mint: PublicKey;
        destinationAta: PublicKey;
      };
      mintArgs.freezeTokenPayment = {
        mint: freezeTokenPaymentValue.mint,
        destinationAta: freezeTokenPaymentValue.destinationAta,
      };
    }

    if (isSome(guards.gatekeeper)) {
      const gatekeeperValue = guards.gatekeeper.value as {
        gatekeeperNetwork: PublicKey;
        expireOnUse: boolean;
      };
      mintArgs.gatekeeper = {
        gatekeeperNetwork: gatekeeperValue.gatekeeperNetwork,
        expireOnUse: gatekeeperValue.expireOnUse,
      };
    }

    if (isSome(guards.redeemedAmount)) {
      mintArgs.redeemedAmount = {};
    }

    if (isSome(guards.allowList)) {
      unsupportedGuards.push("allowList");
    }

    if (isSome(guards.nftGate)) {
      unsupportedGuards.push("nftGate");
    }

    if (isSome(guards.nftPayment)) {
      unsupportedGuards.push("nftPayment");
    }

    if (isSome(guards.nftBurn)) {
      unsupportedGuards.push("nftBurn");
    }

    if (isSome(guards.thirdPartySigner)) {
      unsupportedGuards.push("thirdPartySigner");
    }

    if (unsupportedGuards.length === 0) {
      return {
        mintArgs,
        group: candidate.label,
      };
    }

    candidateFailures.push(
      `${candidate.label ?? "default"}: ${unsupportedGuards.join(", ")}`
    );
  }

  throw new Error(
    `No candy guard set can be satisfied automatically for this wallet. Unsupported guards by group: ${candidateFailures.join(
      " | "
    )}.`
  );
};

const assertCollectionNftAccounts = async (
  umi: Umi,
  collectionMint: PublicKey,
  collectionMetadata: ReturnType<typeof findMetadataPda>,
  collectionMasterEdition: ReturnType<typeof findMasterEditionPda>,
  expectedUpdateAuthority: PublicKey
) => {
  const maxAttempts = 20;
  const retryDelayMs = 500;
  const mplTokenMetadataProgram = umi.programs.getPublicKey(
    "mplTokenMetadata",
    publicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
  );
  const splTokenProgram = publicKey(SPL_TOKEN_PROGRAM_ID);

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
      metadataAccountFinalized,
      masterEditionAccountFinalized,
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
        safeFetchMetadata(umi, collectionMetadata, { commitment: "finalized" }),
        safeFetchMasterEdition(umi, collectionMasterEdition, { commitment: "finalized" }),
      ]);

    const metadataOwnerOk =
      metadataFinalizedRaw.exists &&
      metadataFinalizedRaw.owner.toString() === mplTokenMetadataProgram.toString();
    const masterEditionOwnerOk =
      masterEditionFinalizedRaw.exists &&
      masterEditionFinalizedRaw.owner.toString() === mplTokenMetadataProgram.toString();
    const collectionMintExists = collectionMintFinalizedRaw.exists;
    const collectionMintOwnerOk =
      collectionMintFinalizedRaw.exists &&
      collectionMintFinalizedRaw.owner.toString() === splTokenProgram.toString();
    const metadataUpdateAuthority = metadataAccountFinalized
      ? metadataAccountFinalized.updateAuthority.toString()
      : null;
    const metadataUpdateAuthorityOk =
      metadataUpdateAuthority === expectedUpdateAuthority.toString();

    const rawOwnerCheckPassed =
      collectionMintExists && collectionMintOwnerOk && metadataOwnerOk && masterEditionOwnerOk;
    const typedCheckPassed =
      Boolean(metadataAccountFinalized && masterEditionAccountFinalized) &&
      metadataUpdateAuthorityOk;

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
      collectionMintOwnerExpected: splTokenProgram.toString(),
      collectionMintExistsFinalized: collectionMintFinalizedRaw.exists,
      metadataPda: collectionMetadata[0].toString(),
      metadataExists: metadataConfirmedRaw.exists,
      metadataOwner: metadataConfirmedRaw.exists
        ? metadataConfirmedRaw.owner.toString()
        : null,
      metadataExistsFinalized: metadataFinalizedRaw.exists,
      metadataDecoded: Boolean(metadataAccount),
      metadataDecodedFinalized: Boolean(metadataAccountFinalized),
      metadataUpdateAuthority: metadataAccountFinalized
        ? metadataUpdateAuthority
        : null,
      metadataUpdateAuthorityExpected: expectedUpdateAuthority.toString(),
      masterEditionPda: collectionMasterEdition[0].toString(),
      masterEditionExists: masterEditionConfirmedRaw.exists,
      masterEditionOwner: masterEditionConfirmedRaw.exists
        ? masterEditionConfirmedRaw.owner.toString()
        : null,
      masterEditionExistsFinalized: masterEditionFinalizedRaw.exists,
      masterEditionDecoded: Boolean(masterEditionAccount),
      masterEditionDecodedFinalized: Boolean(masterEditionAccountFinalized),
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
      splTokenProgram: publicKey(SPL_TOKEN_PROGRAM_ID),
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
      collectionMasterEdition,
      umi.identity.publicKey
    );

    const candyMachine = generateSigner(umi);

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
): Promise<{ ticketMintAddress: string; mintSignature: string }> => {
  const umi = createCandyMachineClient(input.walletAdapter);
  const nftMint = generateSigner(umi);
  const candyMachineAddress = publicKey(input.candyMachineAddress);

  // Guard-aware minting: choose a compatible guard set and pass all
  // deterministic mint args so required remaining accounts are derived.
  const candyGuardPda = findCandyGuardPda(umi, { base: candyMachineAddress });
  const candyGuard = await safeFetchCandyGuard(umi, candyGuardPda);
  const guardSelection = candyGuard
    ? resolveGuardSelection(candyGuard)
    : { mintArgs: {} as Partial<DefaultGuardSetMintArgs>, group: null };

  const mintBuilder = mintV2(umi, {
    candyMachine: candyMachineAddress,
    candyGuard: candyGuard ? candyGuardPda : undefined,
    collectionMint: publicKey(input.collectionMintAddress),
    collectionUpdateAuthority: publicKey(input.collectionUpdateAuthorityAddress),
    nftMint,
    tokenStandard: TokenStandard.NonFungible,
    mintArgs: guardSelection.mintArgs,
    group: guardSelection.group ? some(guardSelection.group) : none(),
  });

  let mintResult: Awaited<ReturnType<ReturnType<typeof transactionBuilder>["sendAndConfirm"]>>;

  try {
    mintResult = await transactionBuilder()
      .add(
        toUmiWrappedInstruction(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 })
        )
      )
      .add(
        toUmiWrappedInstruction(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 })
        )
      )
      .add(mintBuilder)
      .sendAndConfirm(umi);
  } catch (error) {
    const sendError = error as {
      getLogs?: () => Promise<string[]>;
      message?: string;
    };

    let logs: string[] = [];

    if (typeof sendError.getLogs === "function") {
      try {
        logs = await sendError.getLogs();
      } catch {
        logs = [];
      }
    }

    if (logs.length > 0) {
      const insufficientLamports = extractInsufficientLamports(logs);

      if (insufficientLamports) {
        const currentSol = (insufficientLamports.currentLamports / 1_000_000_000).toFixed(6);
        const neededSol = (insufficientLamports.neededLamports / 1_000_000_000).toFixed(6);
        const shortfallSol = (insufficientLamports.shortfallLamports / 1_000_000_000).toFixed(6);

        throw new Error(
          `Insufficient SOL to mint. Wallet balance is ${insufficientLamports.currentLamports} lamports (${currentSol} SOL), but at least ${insufficientLamports.neededLamports} lamports (${neededSol} SOL) is required. Top up at least ${insufficientLamports.shortfallLamports} lamports (${shortfallSol} SOL) and retry.`
        );
      }

      throw new Error(
        `Mint transaction simulation failed. ${sendError.message ?? "Unknown send error"}\n${logs.join("\n")}`
      );
    }

    throw error;
  }

  const mintSignature = toBase58Signature(mintResult.signature);
  assertTransactionConfirmed("mint_v2", mintSignature, mintResult.result);

  const rpc = new Connection(getRpcEndpoint(), "confirmed");
  const mintPublicKey = new Web3JsPublicKey(nftMint.publicKey.toString());
  const maxVerificationAttempts = 3;
  let mintAccountExists = false;
  let hasTokenHolder = false;

  for (let attempt = 1; attempt <= maxVerificationAttempts; attempt += 1) {
    const [mintAccountInfo, largestTokenAccounts] = await Promise.all([
      rpc.getParsedAccountInfo(mintPublicKey, "confirmed"),
      rpc.getTokenLargestAccounts(mintPublicKey, "confirmed"),
    ]);

    mintAccountExists = Boolean(mintAccountInfo.value);
    hasTokenHolder = largestTokenAccounts.value.some(
      (entry) => entry.uiAmount !== null && entry.uiAmount > 0
    );

    if (mintAccountExists && hasTokenHolder) {
      break;
    }

    if (attempt < maxVerificationAttempts) {
      await delay(450);
    }
  }

  if (!mintAccountExists || !hasTokenHolder) {
    const txDetails = await rpc.getTransaction(mintSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    const logs = txDetails?.meta?.logMessages ?? [];
    const combinedLogs = logs.join("\n");
    const guardBlocked =
      combinedLogs.includes("MissingRemainingAccount") ||
      combinedLogs.toLowerCase().includes("candy guard botting is taxed") ||
      combinedLogs.toLowerCase().includes("instruction: mintv2");

    if (guardBlocked) {
      throw new Error(
        `Mint transaction was finalized but Candy Guard blocked the mint (bot tax likely charged). Use a newly deployed unguarded candy machine. tx=${mintSignature} mint=${mintPublicKey.toBase58()}`
      );
    }

    if (!mintAccountExists) {
      throw new Error(
        `Mint transaction confirmed but mint account was not found on RPC. tx=${mintSignature} mint=${mintPublicKey.toBase58()}`
      );
    }

    throw new Error(
      `Mint transaction confirmed but no holder token account has a positive balance yet. tx=${mintSignature} mint=${mintPublicKey.toBase58()}`
    );
  }

  return {
    ticketMintAddress: nftMint.publicKey.toString(),
    mintSignature,
  };
};

export const solToLamports = (solAmount: number) => {
  if (!Number.isFinite(solAmount) || solAmount < 0) {
    throw new Error("SOL amount must be a non-negative finite number.");
  }

  return Math.round(solAmount * 1_000_000_000);
};
