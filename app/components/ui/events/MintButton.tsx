"use client";

import { useState } from "react";
import {
  createCandyMachineClient,
  fetchCandyMachineSummary,
  getSolanaWalletAdapterFromDynamicWallet,
  mintTicketFromCandyMachine,
} from "@/lib/candy-machine";
import { recordTicketSale, type OrganizerEvent } from "@/lib/events";

type MintButtonProps = {
  event: OrganizerEvent;
  dynamicUserId: string;
  wallets: unknown[];
  onMinted: (eventId: string, ticketMint: string) => void;
};

export function MintButton({ event, dynamicUserId, wallets, onMinted }: MintButtonProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const canMint = Boolean(event.candyMachineId && event.status !== "ended" && event.status !== "cancelled");

  const mint = async () => {
    if (!event.candyMachineId) {
      setError("This event is not live on-chain yet.");
      return;
    }

    let walletAdapter = null;
    for (const wallet of wallets) {
      walletAdapter = await getSolanaWalletAdapterFromDynamicWallet(
        wallet as Parameters<typeof getSolanaWalletAdapterFromDynamicWallet>[0]
      );

      if (walletAdapter) {
        break;
      }
    }

    if (!walletAdapter) {
      setError("Connect a Solana wallet to mint.");
      return;
    }

    setIsMinting(true);
    setError(null);
    setWarning(null);

    try {
      const umi = createCandyMachineClient(walletAdapter);
      const summary = await fetchCandyMachineSummary(umi, event.candyMachineId);
      if (!summary) {
        throw new Error("Candy machine account could not be found on devnet.");
      }

      const mintResult = await mintTicketFromCandyMachine({
        walletAdapter,
        candyMachineAddress: event.candyMachineId,
        collectionMintAddress: summary.collectionMint,
        collectionUpdateAuthorityAddress: summary.authority,
      });

      const buyerWalletAddress =
        (wallets.find((wallet) => Boolean((wallet as { address?: string } | null)?.address)) as
          | { address?: string }
          | undefined)?.address ??
        walletAdapter.publicKey?.toBase58();

      if (!buyerWalletAddress) {
        throw new Error("Could not determine buyer wallet address.");
      }

      const saleResult = await recordTicketSale({
        dynamicUserId,
        eventId: event.id,
        candyMachineId: event.candyMachineId,
        buyerWallet: buyerWalletAddress,
        ticketMint: mintResult.ticketMintAddress,
        priceLamports: event.priceLamports,
      });

      if (saleResult.error) {
        setWarning(
          `Mint succeeded on-chain, but sale sync failed: ${saleResult.error}. Ticket mint: ${mintResult.ticketMintAddress}`
        );
      }

      onMinted(event.id, mintResult.ticketMintAddress);
    } catch (mintError) {
      setError(mintError instanceof Error ? mintError.message : "Mint failed.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={mint}
        disabled={!canMint || isMinting}
        className="rounded-full border border-emerald-300/50 bg-emerald-300/15 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isMinting ? "Minting..." : "Mint Ticket"}
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      {warning && <p className="text-xs text-amber-300">{warning}</p>}
    </div>
  );
}
