"use client";

import { useState } from "react";
import { useDynamicContext, useSwitchWallet } from "@dynamic-labs/sdk-react-core";
import {
  createCandyMachineClient,
  fetchCandyMachineSummary,
  getSolanaWalletAdapterFromDynamicWallet,
  mintTicketFromCandyMachine,
} from "@/lib/solana/candy-machine";
import { recordTicketSale, type OrganizerEvent } from "@/lib/events";

type MintButtonProps = {
  event: OrganizerEvent;
  dynamicUserId: string;
  wallets: unknown[];
  preferredWalletAddress?: string;
  preferredWalletId?: string;
  onMinted: (eventId: string, ticketMint: string) => void;
};

export function MintButton({
  event,
  dynamicUserId,
  wallets,
  preferredWalletAddress,
  preferredWalletId,
  onMinted,
}: MintButtonProps) {
  const { primaryWallet } = useDynamicContext();
  const switchWallet = useSwitchWallet();
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const canMint = Boolean(event.candyMachineId && event.status !== "ended" && event.status !== "cancelled");

  const isActiveAccountAddressError = (value: unknown) => {
    if (!(value instanceof Error)) return false;
    return value.message.toLowerCase().includes("active account address is required");
  };

  const debugWalletLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[mint-wallet-debug]", ...args);
    }
  };

  const mint = async () => {
    if (!event.candyMachineId) {
      setError("This event is not live on-chain yet.");
      return;
    }

    setIsMinting(true);
    setError(null);
    setWarning(null);

    try {
      debugWalletLog("mint-start", {
        eventId: event.id,
        candyMachineId: event.candyMachineId,
        preferredWalletAddress,
        preferredWalletId,
        primaryWalletId: (primaryWallet as { id?: string } | null)?.id,
      });

      const walletCandidates = [primaryWallet, ...wallets] as Array<{
        id?: string;
        address?: string;
        chain?: string;
        key?: string;
      }>;

      const dedupedWalletCandidates = walletCandidates.filter((wallet, index, all) => {
        if (!wallet) return false;

        const walletKey = `${wallet.id ?? ""}:${wallet.address ?? ""}`;
        return (
          all.findIndex(
            (item) => `${item?.id ?? ""}:${item?.address ?? ""}` === walletKey
          ) === index
        );
      });

      const preferredCandidates = dedupedWalletCandidates.filter(
        (wallet) =>
          (preferredWalletId && wallet.id === preferredWalletId) ||
          (preferredWalletAddress &&
            wallet.address?.toLowerCase() === preferredWalletAddress.toLowerCase())
      );

      const nonPreferredCandidates = dedupedWalletCandidates.filter(
        (wallet) => !preferredCandidates.includes(wallet)
      );

      const rankedWalletCandidates = [
        ...preferredCandidates,
        ...nonPreferredCandidates.sort((left, right) => {
        const scoreWallet = (wallet?: {
          id?: string;
          address?: string;
          chain?: string;
          key?: string;
        }) => {
          if (!wallet) return 0;

          let score = 0;

          if (preferredWalletId && wallet.id === preferredWalletId) {
            score += 100;
          }

          if (
            preferredWalletAddress &&
            wallet.address?.toLowerCase() === preferredWalletAddress.toLowerCase()
          ) {
            score += 80;
          }

          if (wallet.chain?.toLowerCase() === "sol") {
            score += 20;
          }

          if (wallet.key?.toLowerCase().includes("embedded")) {
            score += 10;
          }

          return score;
        };

        return scoreWallet(right) - scoreWallet(left);
      }),
      ];

      debugWalletLog(
        "ranked-candidates",
        rankedWalletCandidates.map((wallet) => ({
          id: wallet.id,
          address: wallet.address,
          chain: wallet.chain,
          key: wallet.key,
        }))
      );

      let activeAddressErrorSeen = false;

      for (const walletCandidate of rankedWalletCandidates) {
        if (walletCandidate?.id) {
          try {
            await switchWallet(walletCandidate.id);
            debugWalletLog("switch-wallet-success", {
              walletId: walletCandidate.id,
              walletAddress: walletCandidate.address,
            });
          } catch {
            // If switching this wallet fails, try a different wallet instead of signing with a stale active account.
            debugWalletLog("switch-wallet-failed", {
              walletId: walletCandidate.id,
              walletAddress: walletCandidate.address,
            });
            continue;
          }
        }

        const walletAdapter = await getSolanaWalletAdapterFromDynamicWallet(
          walletCandidate as Parameters<typeof getSolanaWalletAdapterFromDynamicWallet>[0]
        );

        if (!walletAdapter) {
          debugWalletLog("adapter-missing", {
            walletId: walletCandidate.id,
            walletAddress: walletCandidate.address,
          });
          continue;
        }

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
            walletCandidate?.address ?? walletAdapter.publicKey?.toBase58();

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
          debugWalletLog("mint-success", {
            walletId: walletCandidate.id,
            walletAddress: buyerWalletAddress,
            ticketMint: mintResult.ticketMintAddress,
          });
          return;
        } catch (mintError) {
          if (isActiveAccountAddressError(mintError)) {
            activeAddressErrorSeen = true;
            debugWalletLog("active-account-address-required", {
              walletId: walletCandidate.id,
              walletAddress: walletCandidate.address,
            });
            continue;
          }

          debugWalletLog("mint-failed", {
            walletId: walletCandidate.id,
            walletAddress: walletCandidate.address,
            error: mintError instanceof Error ? mintError.message : mintError,
          });
          throw mintError;
        }
      }

      if (activeAddressErrorSeen) {
        throw new Error(
          "Select your embedded wallet as active in Dynamic, then try minting again."
        );
      }

      throw new Error("Connect a Solana wallet to mint.");
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
        className="rounded-pill bg-white px-4 py-2 text-xs font-semibold text-black shadow-[0_8px_22px_rgba(0,0,0,0.22)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isMinting ? "Minting..." : "Buy ticket"}
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      {warning && <p className="text-xs text-amber-300">{warning}</p>}
    </div>
  );
}
