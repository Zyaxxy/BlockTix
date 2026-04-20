"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Address } from "@solana/kit";
import {
  useDynamicContext,
  useIsLoggedIn,
  useSwitchWallet,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import {
  fetchAuctionActivity,
  fetchAuctionById,
  markAuctionCancelled,
  markAuctionRefunded,
  markAuctionResolved,
  recordAuctionBid,
  type AuctionActivity,
  type OrganizerAuction,
} from "@/lib/auctions";
import { fetchUserProfile } from "@/lib/profile";
import {
  buildBidInstruction,
  buildCancelAuctionInstruction,
  buildClaimRefundInstruction,
  buildResolveAuctionInstruction,
} from "@/lib/solana/auction";
import {
  deriveAssociatedTokenAddress,
  sendAuctionInstructionWithSimulation,
  toAuctionInstructionSigner,
} from "@/lib/solana/auction-transaction";

type WalletLike = {
  id?: string;
  address?: string;
  chain?: string;
};

type ConnectedWallet = WalletLike & {
  address: string;
};

const toAddress = (value: string): Address => value as Address;

const isSolanaWallet = (wallet: WalletLike | null | undefined) => {
  const chain = wallet?.chain?.toLowerCase();
  return Boolean(chain && chain.includes("sol"));
};

const formatCountdown = (seconds: number) => {
  const safe = Math.max(seconds, 0);
  const days = Math.floor(safe / (24 * 3600));
  const hours = Math.floor((safe % (24 * 3600)) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${remainder}s`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

export default function AuctionDetailPage() {
  const params = useParams<{ auctionId: string }>();
  const router = useRouter();
  const isLoggedIn = useIsLoggedIn();
  const { user, primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();
  const switchWallet = useSwitchWallet();

  const [dynamicUserId, setDynamicUserId] = useState<string | null>(null);
  const [auction, setAuction] = useState<OrganizerAuction | null>(null);
  const [activity, setActivity] = useState<AuctionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [bidAmount, setBidAmount] = useState("1");
  const [now, setNow] = useState(() => Date.now());

  const auctionId = typeof params.auctionId === "string" ? params.auctionId : "";

  const wallets = useMemo(
    () => [primaryWallet, ...userWallets].filter(Boolean) as WalletLike[],
    [primaryWallet, userWallets]
  );

  const activeSolWallet = useMemo(() => {
    const active = primaryWallet as WalletLike | null;
    if (isSolanaWallet(active) && active?.address) {
      return active;
    }

    return wallets.find((wallet) => isSolanaWallet(wallet) && wallet.address) ?? null;
  }, [primaryWallet, wallets]);

  const refreshAuctionData = async (targetAuctionId: string) => {
    const [auctionResult, activityResult] = await Promise.all([
      fetchAuctionById(targetAuctionId),
      fetchAuctionActivity(targetAuctionId),
    ]);

    setAuction(auctionResult);
    setActivity(activityResult);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const uid = user?.userId;
    if (!uid || !auctionId) {
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const profile = await fetchUserProfile(uid);
        if (!active) return;

        if (!profile) {
          router.replace("/login");
          return;
        }

        await refreshAuctionData(auctionId);
        if (!active) return;

        setDynamicUserId(uid);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load auction.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [isLoggedIn, router, user?.userId, auctionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auctionId) {
      return;
    }

    const timer = window.setInterval(() => {
      refreshAuctionData(auctionId).catch(() => {
        // Polling should not surface transient errors aggressively.
      });
    }, 8000);

    return () => window.clearInterval(timer);
  }, [auctionId]);

  const countdown = useMemo(() => {
    if (!auction) {
      return { seconds: 0, ended: false, label: "--:--:--" };
    }

    const endAt = new Date(auction.endTime).getTime();
    const remainingSeconds = Math.floor((endAt - now) / 1000);
    const ended = remainingSeconds <= 0;

    return {
      seconds: Math.max(remainingSeconds, 0),
      ended,
      label: ended ? "Auction ended" : formatCountdown(remainingSeconds),
    };
  }, [auction, now]);

  const walletAddress = activeSolWallet?.address?.trim() ?? null;
  const isOrganizer = Boolean(dynamicUserId && auction && dynamicUserId === auction.organizerUid);
  const isMakerWallet = Boolean(
    walletAddress && auction && walletAddress.toLowerCase() === auction.makerWallet.toLowerCase()
  );
  const isWinnerWallet = Boolean(
    walletAddress && auction?.highestBidder && walletAddress.toLowerCase() === auction.highestBidder.toLowerCase()
  );

  const canBid = Boolean(auction && auction.status === "active" && !countdown.ended);
  const canResolve = Boolean(
    auction &&
      auction.status === "active" &&
      countdown.ended &&
      auction.highestBidder &&
      isOrganizer &&
      isMakerWallet
  );
  const canCancel = Boolean(
    auction &&
      auction.status === "active" &&
      countdown.ended &&
      !auction.highestBidder &&
      isOrganizer &&
      isMakerWallet
  );
  const canRefund = Boolean(
    auction && auction.status === "resolved" && walletAddress && !isWinnerWallet && !isMakerWallet
  );

  const ensureActionWallet = async (makerOnly = false): Promise<ConnectedWallet> => {
    if (!wallets.length) {
      throw new Error("Connect a Solana wallet first.");
    }

    const selected = makerOnly
      ? wallets.find(
          (wallet) =>
            isSolanaWallet(wallet) &&
            wallet.address?.toLowerCase() === auction?.makerWallet.toLowerCase()
        )
      : activeSolWallet;

    if (!selected || !selected.address) {
      if (makerOnly) {
        throw new Error("Switch to the maker wallet to run this action.");
      }
      throw new Error("No active Solana wallet found.");
    }

    if (selected.id && (primaryWallet as WalletLike | null)?.id !== selected.id) {
      await switchWallet(selected.id);
    }

    return selected as ConnectedWallet;
  };

  const onBid = async () => {
    if (!auction || !dynamicUserId) {
      return;
    }

    const parsedAmount = Number(bidAmount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Bid amount must be a positive integer.");
      return;
    }

    const bidderWallet = await ensureActionWallet();

    const approved = window.confirm(
      `Bid ${parsedAmount} token units on auction ${auction.auctionAddress}.\nWallet: ${bidderWallet.address}\nCluster: devnet (configured RPC)`
    );
    if (!approved) return;

    setIsActionBusy(true);
    setError(null);
    setActionMessage("Preparing bid transaction...");

    try {
      const bidderAddress = bidderWallet.address;
      const bidderSigner = toAuctionInstructionSigner(bidderAddress);
      const bidderBidAta = deriveAssociatedTokenAddress(bidderAddress, auction.bidMint);
      const instruction = await buildBidInstruction({
        bidder: bidderSigner,
        auction: toAddress(auction.auctionAddress),
        bidderBidAta: toAddress(bidderBidAta),
        bidMint: toAddress(auction.bidMint),
        additionalAmount: BigInt(parsedAmount),
      });

      setActionMessage("Simulating and submitting bid...");
      const tx = await sendAuctionInstructionWithSimulation({
        instruction,
        wallet: bidderWallet as Parameters<typeof sendAuctionInstructionWithSimulation>[0]["wallet"],
      });

      const projectedHighest = Math.max(
        Number(auction.highestBidAmount ?? 0),
        Number(auction.highestBidAmount ?? 0) + parsedAmount
      );

      const bidResult = await recordAuctionBid({
        dynamicUserId,
        auctionId: auction.id,
        bidderWallet: bidderAddress,
        amount: parsedAmount,
        signature: tx.signature,
        highestBidAmount: projectedHighest,
      });

      if (bidResult.error) {
        throw new Error(bidResult.error);
      }

      await refreshAuctionData(auction.id);
      setActionMessage(`Bid submitted: ${tx.signature.slice(0, 10)}...`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Bid failed.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const onResolve = async () => {
    if (!auction || !dynamicUserId || !auction.highestBidder) {
      return;
    }

    const resolverWallet = await ensureActionWallet(true);

    const approved = window.confirm(
      `Resolve auction ${auction.auctionAddress}.\nWinner: ${auction.highestBidder}\nWallet: ${resolverWallet.address}`
    );
    if (!approved) return;

    setIsActionBusy(true);
    setError(null);
    setActionMessage("Preparing resolve transaction...");

    try {
      const resolverSigner = toAuctionInstructionSigner(resolverWallet.address);
      const instruction = await buildResolveAuctionInstruction({
        resolver: resolverSigner,
        auction: toAddress(auction.auctionAddress),
        winner: toAddress(auction.highestBidder),
        maker: toAddress(auction.makerWallet),
        nftMint: toAddress(auction.nftMint),
        bidMint: toAddress(auction.bidMint),
      });

      setActionMessage("Simulating and submitting resolve...");
      const tx = await sendAuctionInstructionWithSimulation({
        instruction,
        wallet: resolverWallet as Parameters<typeof sendAuctionInstructionWithSimulation>[0]["wallet"],
      });

      const resolveResult = await markAuctionResolved({
        dynamicUserId,
        auctionId: auction.id,
        resolveSignature: tx.signature,
        winnerWallet: auction.highestBidder,
        highestBidAmount: auction.highestBidAmount,
      });

      if (resolveResult.error) {
        throw new Error(resolveResult.error);
      }

      await refreshAuctionData(auction.id);
      setActionMessage(`Auction resolved: ${tx.signature.slice(0, 10)}...`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Resolve failed.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const onCancel = async () => {
    if (!auction || !dynamicUserId) {
      return;
    }

    const makerWallet = await ensureActionWallet(true);

    const approved = window.confirm(
      `Cancel auction ${auction.auctionAddress} and return deposited NFT to maker ${auction.makerWallet}.`
    );
    if (!approved) return;

    setIsActionBusy(true);
    setError(null);
    setActionMessage("Preparing cancel transaction...");

    try {
      const makerSigner = toAuctionInstructionSigner(makerWallet.address);
      const instruction = await buildCancelAuctionInstruction({
        maker: makerSigner,
        auction: toAddress(auction.auctionAddress),
        nftMint: toAddress(auction.nftMint),
        bidMint: toAddress(auction.bidMint),
      });

      setActionMessage("Simulating and submitting cancel...");
      const tx = await sendAuctionInstructionWithSimulation({
        instruction,
        wallet: makerWallet as Parameters<typeof sendAuctionInstructionWithSimulation>[0]["wallet"],
      });

      const cancelResult = await markAuctionCancelled({
        dynamicUserId,
        auctionId: auction.id,
        cancelSignature: tx.signature,
      });

      if (cancelResult.error) {
        throw new Error(cancelResult.error);
      }

      await refreshAuctionData(auction.id);
      setActionMessage(`Auction cancelled: ${tx.signature.slice(0, 10)}...`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Cancel failed.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const onRefund = async () => {
    if (!auction || !dynamicUserId) {
      return;
    }

    const bidderWallet = await ensureActionWallet(false);
    const bidderAddress = bidderWallet.address;

    if (auction.highestBidder && bidderAddress.toLowerCase() === auction.highestBidder.toLowerCase()) {
      setError("Winning bidder cannot claim a refund.");
      return;
    }

    const approved = window.confirm(
      `Claim refund for auction ${auction.auctionAddress} with wallet ${bidderAddress}.`
    );
    if (!approved) return;

    setIsActionBusy(true);
    setError(null);
    setActionMessage("Preparing refund transaction...");

    try {
      const bidderSigner = toAuctionInstructionSigner(bidderAddress);
      const instruction = await buildClaimRefundInstruction({
        bidder: bidderSigner,
        maker: toAddress(auction.makerWallet),
        auction: toAddress(auction.auctionAddress),
        bidMint: toAddress(auction.bidMint),
      });

      setActionMessage("Simulating and submitting refund...");
      const tx = await sendAuctionInstructionWithSimulation({
        instruction,
        wallet: bidderWallet as Parameters<typeof sendAuctionInstructionWithSimulation>[0]["wallet"],
      });

      const latestBid = activity.find(
        (entry) =>
          entry.actionType === "bid" &&
          entry.actorWallet?.toLowerCase() === bidderAddress.toLowerCase()
      );

      const refundResult = await markAuctionRefunded({
        dynamicUserId,
        auctionId: auction.id,
        bidderWallet: bidderAddress,
        refundSignature: tx.signature,
        amount: latestBid?.amount ?? undefined,
      });

      if (refundResult.error) {
        throw new Error(refundResult.error);
      }

      await refreshAuctionData(auction.id);
      setActionMessage(`Refund submitted: ${tx.signature.slice(0, 10)}...`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Refund failed.");
    } finally {
      setIsActionBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060709] text-white">
        <p className="text-sm text-white/60">Loading auction details...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-[#060709] px-4 py-10 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-white/70">Auction not found.</p>
          <Link
            href="/user/auctions"
            className="mt-4 inline-flex rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80"
          >
            Back to auctions
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060709] px-4 py-8 text-white md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Auction Detail</p>
            <h1 className="text-2xl font-semibold">{auction.title ?? `Auction #${auction.seed}`}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/organizer/auctions"
              className="rounded-lg border border-white/20 px-3 py-2 text-white/80 transition hover:bg-white/10"
            >
              Organizer View
            </Link>
            <Link
              href="/user/auctions"
              className="rounded-lg border border-white/20 px-3 py-2 text-white/80 transition hover:bg-white/10"
            >
              User View
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Countdown</p>
            <p className="mt-2 text-3xl font-semibold text-orange-300">{countdown.label}</p>
            <p className="mt-2 text-sm text-white/60">
              Ends at {formatDateTime(auction.endTime)} • Status: {auction.status}
            </p>
            {auction.description ? (
              <p className="mt-3 text-sm text-white/70">{auction.description}</p>
            ) : null}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Highest Bid</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {auction.highestBidAmount ?? 0}
            </p>
            <p className="mt-2 break-all text-xs text-white/60">
              Bidder: {auction.highestBidder ?? "No bids yet"}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-base font-semibold text-white">Wallet Actions</h2>
          <p className="mt-1 text-xs text-white/50">
            Active wallet: {walletAddress ?? "Not connected"}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Place Bid</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={bidAmount}
                  onChange={(event) => setBidAmount(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm"
                  placeholder="Additional bid amount"
                />
                <button
                  onClick={onBid}
                  disabled={!canBid || isActionBusy}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Bid
                </button>
              </div>
              {!canBid && <p className="mt-2 text-xs text-white/50">Bidding is currently unavailable.</p>}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Settle Auction</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={onResolve}
                  disabled={!canResolve || isActionBusy}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Resolve
                </button>
                <button
                  onClick={onCancel}
                  disabled={!canCancel || isActionBusy}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={onRefund}
                  disabled={!canRefund || isActionBusy}
                  className="rounded-lg border border-emerald-400/40 px-3 py-2 text-sm text-emerald-200 disabled:opacity-60"
                >
                  Claim Refund
                </button>
              </div>
              <p className="mt-2 text-xs text-white/50">
                Resolve/cancel requires organizer maker wallet. Refund is for losing bidders after resolution.
              </p>
            </div>
          </div>

          {actionMessage && <p className="mt-3 text-xs text-emerald-300">{actionMessage}</p>}
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-base font-semibold text-white">Recent Activity</h2>
          <div className="mt-3 space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-white/60">No activity yet.</p>
            ) : (
              activity.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-white/90">
                    {entry.actionType.toUpperCase()} {entry.amount ? `• ${entry.amount}` : ""}
                  </p>
                  <p className="mt-1 break-all text-xs text-white/60">
                    Actor: {entry.actorWallet ?? entry.actorUid ?? "Unknown"}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{formatDateTime(entry.createdAt)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
