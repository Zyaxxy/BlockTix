"use client";

import { useMemo, useState } from "react";
import type { Address } from "@solana/kit";
import { useDynamicContext, useSwitchWallet, useUserWallets } from "@dynamic-labs/sdk-react-core";
import {
  createAuction,
  type OrganizerAuction,
} from "@/lib/auctions";
import type { OrganizerEvent } from "@/lib/events";
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
  organizerUid: string;
  events: OrganizerEvent[];
  onCreated: (auction: OrganizerAuction) => void;
};

type WalletLike = {
  id?: string;
  address?: string;
  chain?: string;
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

export function AuctionCreateForm({
  dynamicUserId,
  organizerUid,
  events,
  onCreated,
}: AuctionCreateFormProps) {
  const { primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();
  const switchWallet = useSwitchWallet();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState("");
  const [nftMint, setNftMint] = useState("");
  const [bidMint, setBidMint] = useState("");
  const [seed, setSeed] = useState(() => String(Date.now()));
  const [endTime, setEndTime] = useState("");
  const [depositAmount, setDepositAmount] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const wallets = useMemo(
    () => [primaryWallet, ...userWallets].filter(Boolean) as WalletLike[],
    [primaryWallet, userWallets]
  );

  const onSubmit = async () => {
    setError(null);
    setStatus(null);

    if (!dynamicUserId || dynamicUserId !== organizerUid) {
      setError("Organizer identity mismatch.");
      return;
    }

    if (!nftMint.trim() || !bidMint.trim() || !seed.trim() || !endTime.trim()) {
      setError("NFT mint, bid mint, seed, and end time are required.");
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

    const preferredWallet =
      (wallets.find((wallet) => wallet.chain?.toLowerCase().includes("sol")) as ConnectedWallet | undefined) ??
      (wallets.find((wallet): wallet is ConnectedWallet => Boolean(wallet.address?.trim())) as
        | ConnectedWallet
        | undefined);

    if (!preferredWallet) {
      setError("Connect a Solana wallet first.");
      return;
    }

    const makerAddress = preferredWallet.address;

    const confirmed = window.confirm(
      `Create auction with\n- Maker: ${preferredWallet.address}\n- NFT Mint: ${nftMint.trim()}\n- Bid Mint: ${bidMint.trim()}\n- End Time: ${new Date(unixSeconds * 1000).toISOString()}\n- Deposit Amount: ${parsedDepositAmount}`
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (preferredWallet.id) {
        await switchWallet(preferredWallet.id);
      }

      setStatus("Building transaction...");
      const makerSigner = toAuctionInstructionSigner(makerAddress);
      const instruction = await buildMakeAuctionInstruction({
        maker: makerSigner,
        nftMint: toAddress(nftMint.trim()),
        bidMint: toAddress(bidMint.trim()),
        seed: BigInt(parsedSeed),
        endTime: BigInt(unixSeconds),
        depositAmount: BigInt(parsedDepositAmount),
      });

      setStatus("Simulating and submitting transaction...");
      const txResult = await sendAuctionInstructionWithSimulation({
        instruction,
        wallet: preferredWallet as Parameters<typeof sendAuctionInstructionWithSimulation>[0]["wallet"],
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
        organizerUid,
        makerWallet: makerAddress,
        auctionAddress,
        seed: parsedSeed,
        nftMint: nftMint.trim(),
        bidMint: bidMint.trim(),
        endTime: new Date(unixSeconds * 1000).toISOString(),
        eventId: eventId || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        createSignature: txResult.signature,
      });

      if (createResult.error || !createResult.data) {
        throw new Error(createResult.error ?? "Could not persist auction record.");
      }

      onCreated(createResult.data);
      setStatus(`Auction created. Signature: ${txResult.signature.slice(0, 8)}...`);
      setTitle("");
      setDescription("");
      setEventId("");
      setNftMint("");
      setBidMint("");
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
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title (optional)"
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
        />
        <select
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
        >
          <option value="">Link to event (optional)</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <input
          value={nftMint}
          onChange={(event) => setNftMint(event.target.value)}
          placeholder="Prize NFT mint"
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
        />
        <input
          value={bidMint}
          onChange={(event) => setBidMint(event.target.value)}
          placeholder="Bid token mint"
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
        />
        <input
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          placeholder="Seed"
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
        />
        <input
          value={depositAmount}
          onChange={(event) => setDepositAmount(event.target.value)}
          placeholder="Deposit amount"
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm md:col-span-2"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          className="min-h-24 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm md:col-span-2"
        />
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
