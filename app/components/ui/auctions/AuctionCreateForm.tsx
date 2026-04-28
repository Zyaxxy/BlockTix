"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "@solana/kit";
import { useDynamicContext, useSwitchWallet, useUserWallets } from "@dynamic-labs/sdk-react-core";
import {
  createAuction,
  type OrganizerAuction,
} from "@/lib/auctions";
import { fetchWalletNftMints, type WalletTokenMint } from "@/lib/solana/wallet-tokens";
import {
  buildMakeAuctionInstruction,
  deriveAuctionAddress,
} from "@/lib/solana/auction";
import {
  sendAuctionInstructionWithSimulation,
  toAuctionInstructionSigner,
} from "@/lib/solana/auction-transaction";

type AuctionCreateFormProps = {
  dynamicUserId: string;
  creatorUid: string;
  onCreated: (auction: OrganizerAuction) => void;
};

const BID_TOKEN_OPTIONS = [
  {
    label: "SOL (native)",
    mint: "So11111111111111111111111111111111111111112",
    nativeSol: true,
  },
  {
    label: "USDC",
    mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    nativeSol: false,
  },
  {
    label: "USDT",
    mint: "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS",
    nativeSol: false,
  },
] as const;

type WalletLike = NonNullable<Parameters<typeof sendAuctionInstructionWithSimulation>[0]["wallet"]> & {
  id?: string;
  chain?: string;
  key?: string;
};

type ConnectedWallet = WalletLike & {
  address: string;
};

const toAddress = (value: string): Address => value as Address;

const toUnixSeconds = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.floor(date.getTime() / 1000);
};

const formatMintPreview = (mint: string) => {
  if (mint.length <= 10) {
    return mint;
  }

  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
};

const isActiveAccountAddressError = (value: unknown) => {
  if (!(value instanceof Error)) {
    return false;
  }

  return value.message.toLowerCase().includes("active account address is required");
};

export function AuctionCreateForm({
  dynamicUserId,
  creatorUid,
  onCreated,
}: AuctionCreateFormProps) {
  const { primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();
  const switchWallet = useSwitchWallet();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [nftMint, setNftMint] = useState("");
  const [bidMint, setBidMint] = useState<string>(BID_TOKEN_OPTIONS[0].mint);
  const [seed, setSeed] = useState(() => String(Date.now()));
  const [endTime, setEndTime] = useState("");
  const [depositAmount, setDepositAmount] = useState("1");
  const [availablePrizeNftMints, setAvailablePrizeNftMints] = useState<WalletTokenMint[]>([]);
  const [isLoadingPrizeNftMints, setIsLoadingPrizeNftMints] = useState(false);
  const [prizeNftStatus, setPrizeNftStatus] = useState<string | null>(null);
  const [prizeNftRefreshNonce, setPrizeNftRefreshNonce] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const wallets = useMemo(
    () => [primaryWallet, ...userWallets].filter(Boolean) as WalletLike[],
    [primaryWallet, userWallets]
  );

  const rankedWalletCandidates = useMemo(() => {
    const dedupedWallets = wallets.filter((wallet, index, all) => {
      const walletKey = `${wallet.id ?? ""}:${wallet.address ?? ""}`;
      return (
        all.findIndex(
          (item) => `${item.id ?? ""}:${item.address ?? ""}` === walletKey
        ) === index
      );
    });

    return dedupedWallets.sort((left, right) => {
      const scoreWallet = (wallet: WalletLike) => {
        let score = 0;

        if (wallet.chain?.toLowerCase().includes("sol")) {
          score += 40;
        }

        if (wallet.key?.toLowerCase().includes("embedded")) {
          score += 20;
        }

        if (
          primaryWallet &&
          ((wallet.id && wallet.id === (primaryWallet as WalletLike).id) ||
            (wallet.address &&
              wallet.address.toLowerCase() ===
              ((primaryWallet as WalletLike).address ?? "").toLowerCase()))
        ) {
          score += 10;
        }

        if (wallet.address?.trim()) {
          score += 5;
        }

        return score;
      };

      return scoreWallet(right) - scoreWallet(left);
    });
  }, [primaryWallet, wallets]);

  const selectedWalletForPrizeNft = useMemo(
    () =>
      rankedWalletCandidates.find(
        (wallet): wallet is ConnectedWallet => Boolean(wallet.address?.trim())
      ),
    [rankedWalletCandidates]
  );

  useEffect(() => {
    let isDisposed = false;

    const loadWalletPrizeNftMints = async () => {
      const walletAddress = selectedWalletForPrizeNft?.address;
      if (!walletAddress) {
        setAvailablePrizeNftMints([]);
        setNftMint("");
        setPrizeNftStatus("Connect a Solana wallet to auto-detect prize NFT mints.");
        return;
      }

      setIsLoadingPrizeNftMints(true);
      setNftMint("");
      setPrizeNftStatus("Loading NFT mints from your wallet...");

      try {
        const mints = await fetchWalletNftMints(walletAddress);
        if (isDisposed) {
          return;
        }

        setAvailablePrizeNftMints(mints);

        if (mints.length > 0) {
          setNftMint((current) => {
            if (current && mints.some((item) => item.mint === current)) {
              return current;
            }
            return mints[0].mint;
          });
          setPrizeNftStatus(`Auto-selected prize NFT from wallet ${walletAddress}.`);
        } else {
          setNftMint("");
          setPrizeNftStatus("No NFT mints found in this wallet.");
        }
      } catch (mintLoadError) {
        if (isDisposed) {
          return;
        }

        setAvailablePrizeNftMints([]);
        setPrizeNftStatus(
          mintLoadError instanceof Error
            ? `Could not read wallet NFT mints: ${mintLoadError.message}`
            : "Could not read wallet NFT mints."
        );
      } finally {
        if (!isDisposed) {
          setIsLoadingPrizeNftMints(false);
        }
      }
    };

    void loadWalletPrizeNftMints();

    return () => {
      isDisposed = true;
    };
  }, [selectedWalletForPrizeNft?.address, prizeNftRefreshNonce]);

  const onSubmit = async () => {
    setError(null);
    setStatus(null);

    if (!dynamicUserId || dynamicUserId !== creatorUid) {
      setError("Creator identity mismatch.");
      return;
    }

    if (!nftMint.trim() || !bidMint.trim() || !seed.trim() || !endTime.trim()) {
      setError("Prize NFT mint, bid token mint, and end time are required.");
      return;
    }

    const parsedSeed = Number(seed);
    if (!Number.isInteger(parsedSeed) || parsedSeed < 0) {
      setError("Seed must be a non-negative integer.");
      return;
    }

    const parsedDepositAmount = Number(depositAmount);
    if (!Number.isInteger(parsedDepositAmount) || parsedDepositAmount <= 0) {
      setError("Deposit amount must be a positive integer.");
      return;
    }

    const unixSeconds = toUnixSeconds(endTime);
    if (!unixSeconds) {
      setError("End time must be a valid date.");
      return;
    }

    const executionWalletCandidates = rankedWalletCandidates.filter(
      (wallet): wallet is ConnectedWallet => Boolean(wallet.address?.trim())
    );

    if (executionWalletCandidates.length === 0) {
      setError("Connect a Solana wallet first.");
      return;
    }

    const previewWallet = executionWalletCandidates[0];
    const selectedBidToken = BID_TOKEN_OPTIONS.find((option) => option.mint === bidMint) ?? BID_TOKEN_OPTIONS[0];

    const confirmed = window.confirm(
      `Create auction with\n- Maker: ${previewWallet.address}\n- Prize NFT Mint: ${nftMint.trim()}\n- Bid Asset: ${selectedBidToken.label}\n- End Time: ${new Date(unixSeconds * 1000).toISOString()}\n- Deposit Amount: ${parsedDepositAmount}`
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      let createdAuction: OrganizerAuction | null = null;
      let createdSignature: string | null = null;

      for (const walletCandidate of executionWalletCandidates) {
        const makerAddress = walletCandidate.address;

        try {
          if (walletCandidate.id) {
            await switchWallet(walletCandidate.id);
          }

          setStatus(`Building transaction for wallet ${makerAddress}...`);
          const makerSigner = toAuctionInstructionSigner(makerAddress);
          const instruction = await buildMakeAuctionInstruction({
            maker: makerSigner,
            nftMint: toAddress(nftMint.trim()),
            bidMint: toAddress(bidMint.trim()),
            seed: BigInt(parsedSeed),
            endTime: BigInt(unixSeconds),
            depositAmount: BigInt(parsedDepositAmount),
            nativeSol: selectedBidToken.nativeSol,
          });

          setStatus("Simulating and submitting transaction...");
          const txResult = await sendAuctionInstructionWithSimulation({
            instruction,
            wallet: walletCandidate,
          });

          const derivedAuctionAddress = await deriveAuctionAddress(
            toAddress(makerAddress),
            BigInt(parsedSeed)
          );
          const auctionAddress = (Array.isArray(derivedAuctionAddress)
            ? derivedAuctionAddress[0]
            : derivedAuctionAddress).toString();

          setStatus("Saving auction record...");
          const createResult = await createAuction({
            dynamicUserId,
            creatorUid,
            makerWallet: makerAddress,
            auctionAddress,
            seed: parsedSeed,
            nftMint: nftMint.trim(),
            bidMint: bidMint.trim(),
            nativeSol: selectedBidToken.nativeSol,
            endTime: new Date(unixSeconds * 1000).toISOString(),
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            createSignature: txResult.signature,
          });

          if (createResult.error || !createResult.data) {
            throw new Error(createResult.error ?? "Could not persist auction record.");
          }

          createdAuction = createResult.data;
          createdSignature = txResult.signature;
          break;
        } catch (submitError) {
          if (isActiveAccountAddressError(submitError)) {
            continue;
          }

          throw submitError;
        }
      }

      if (!createdAuction || !createdSignature) {
        throw new Error("Connect a Solana wallet that supports embedded signing, then retry.");
      }

      onCreated(createdAuction);
      setStatus(`Auction created. Signature: ${createdSignature.slice(0, 8)}...`);
      setTitle("");
      setDescription("");
      setNftMint(availablePrizeNftMints[0]?.mint ?? "");
      setBidMint(BID_TOKEN_OPTIONS[0].mint);
      setSeed(String(Date.now()));
      setEndTime("");
      setDepositAmount("1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Auction creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-semibold text-white">Create Auction</h2>
      <p className="mt-1 text-sm text-white/60">
        This creates the on-chain auction first, then stores minimal linkage in Supabase.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="auction-title">
          <span className="uppercase tracking-[0.2em] text-white/40">Title</span>
          <input
            id="auction-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Auction title"
            className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="auction-nft-mint">
          <span className="uppercase tracking-[0.2em] text-white/40">Prize NFT Mint</span>
          <select
            id="auction-nft-mint"
            value={nftMint}
            onChange={(event) => setNftMint(event.target.value)}
            className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
            disabled={isLoadingPrizeNftMints || availablePrizeNftMints.length === 0}
          >
            <option value="">
              {availablePrizeNftMints.length > 0 ? "Select an NFT mint" : "No NFT mints found"}
            </option>
            {availablePrizeNftMints.map((tokenMint) => (
              <option key={tokenMint.mint} value={tokenMint.mint}>
                {formatMintPreview(tokenMint.mint)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="auction-bid-mint">
          <span className="uppercase tracking-[0.2em] text-white/40">Bid Asset</span>
          <select
            id="auction-bid-mint"
            value={bidMint}
            onChange={(event) => setBidMint(event.target.value)}
            className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {BID_TOKEN_OPTIONS.map((token) => (
              <option key={token.mint} value={token.mint}>
                {token.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="auction-deposit-amount">
          <span className="uppercase tracking-[0.2em] text-white/40">Prize Quantity</span>
          <input
            id="auction-deposit-amount"
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
            placeholder="e.g. 1"
            className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2" htmlFor="auction-end-time">
          <span className="uppercase tracking-[0.2em] text-white/40">End Time</span>
          <input
            id="auction-end-time"
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white md:col-span-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2" htmlFor="auction-description">
          <span className="uppercase tracking-[0.2em] text-white/40">Description</span>
          <textarea
            id="auction-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            className="min-h-24 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        </label>
        <div className="md:col-span-2 flex items-center justify-between gap-3 text-xs text-white/60">
          <span>{prizeNftStatus ?? "Prize NFT mint is selected from your wallet."}</span>
          <button
            type="button"
            onClick={() => setPrizeNftRefreshNonce((value) => value + 1)}
            disabled={isLoadingPrizeNftMints}
            className="rounded-md border border-white/20 px-2 py-1 text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            {isLoadingPrizeNftMints ? "Loading..." : "Refresh NFTs"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Create Auction"}
        </button>
        {status && <p className="text-xs text-emerald-300">{status}</p>}
      </div>

      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
    </section>
  );
}
