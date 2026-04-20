"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDynamicContext,
  useIsLoggedIn,
  useSwitchWallet,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";
import { fetchUserTicketSales, type UserTicketSale } from "@/lib/events";
import type { DynamicWalletLike } from "@/lib/solana/candy-machine";
import { fetchSolBalance } from "@/lib/solana/balance";
import { WalletOverview } from "@/app/components/ui/wallet/WalletOverview";
import { TicketGallery } from "@/app/components/ui/wallet/TicketGallery";
import { SendSolForm } from "@/app/components/ui/wallet/SendSolForm";
import { TransactionHistory } from "@/app/components/ui/wallet/TransactionHistory";
import { ArrowLeft, LogOut } from "lucide-react";

export default function WalletPage() {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();
  const switchWallet = useSwitchWallet();
  const userWallets = useUserWallets();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tickets, setTickets] = useState<UserTicketSale[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const safeUserWallets = useMemo(() => {
    return Array.isArray(userWallets) ? userWallets : [];
  }, [userWallets]);

  const wallets = useMemo(
    () => [primaryWallet, ...safeUserWallets].filter(Boolean),
    [primaryWallet, safeUserWallets]
  );

  const preferredEmbeddedSolCredential = useMemo(() => {
    return user?.verifiedCredentials?.find((credential) => {
      const provider = credential.walletProvider?.toLowerCase();
      const chain = credential.chain?.toLowerCase();
      const format = credential.format?.toLowerCase();
      return (
        format === "blockchain" &&
        chain === "solana" &&
        provider?.includes("embedded")
      );
    });
  }, [user?.verifiedCredentials]);

  const embeddedWallet = useMemo(() => {
    const candidates = wallets as Array<{
      id?: string;
      address?: string;
      chain?: string;
      key?: string;
    }>;

    return candidates.find((wallet) => {
      const isSolWallet = wallet.chain?.toLowerCase() === "sol";
      if (!isSolWallet) return false;

      const idMatches =
        Boolean(preferredEmbeddedSolCredential?.embeddedWalletId) &&
        wallet.id === preferredEmbeddedSolCredential?.embeddedWalletId;
      const addressMatches =
        Boolean(preferredEmbeddedSolCredential?.address) &&
        wallet.address?.toLowerCase() ===
          preferredEmbeddedSolCredential?.address?.toLowerCase();
      const keyLooksEmbedded = wallet.key?.toLowerCase().includes("embedded") ?? false;

      return idMatches || addressMatches || keyLooksEmbedded;
    });
  }, [wallets, preferredEmbeddedSolCredential]);

  const isEmbeddedWalletActive = useMemo(() => {
    const current = primaryWallet as { id?: string; address?: string } | null;
    if (!current || !embeddedWallet) return false;

    return (
      (Boolean(current.id) && current.id === embeddedWallet.id) ||
      (Boolean(current.address) &&
        Boolean(embeddedWallet.address) &&
        current.address?.toLowerCase() === embeddedWallet.address?.toLowerCase())
    );
  }, [embeddedWallet, primaryWallet]);

  const activeEmbeddedWallet = useMemo(() => {
    if (!isEmbeddedWalletActive) return null;
    return primaryWallet as DynamicWalletLike | null;
  }, [isEmbeddedWalletActive, primaryWallet]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const uid = user?.userId;
    if (!uid) return;

    let active = true;

    const checkRole = async () => {
      try {
        const data = await fetchUserProfile(uid);

        if (!active) return;

        if (!data) {
          router.replace("/login");
          return;
        }

        if (data.role !== "user") {
          router.replace("/organizer");
          return;
        }

        const walletAddress = embeddedWallet?.address;
        if (!walletAddress) {
          setReady(true);
          return;
        }

        const [userTickets, solBalance] = await Promise.all([
          fetchUserTicketSales(walletAddress),
          fetchSolBalance(walletAddress),
        ]);

        if (!active) return;

        setTickets(userTickets);
        setBalance(solBalance);
        setReady(true);
      } catch {
        if (!active) return;
        router.replace("/login");
      }
    };

    checkRole();

    return () => {
      active = false;
    };
  }, [isLoggedIn, user, router, embeddedWallet]);

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login");
  };

  const onActivateEmbeddedWallet = async () => {
    if (!embeddedWallet?.id) {
      throw new Error("Embedded wallet is missing an id");
    }
    await switchWallet(embeddedWallet.id);
  };

  const onTransferComplete = async () => {
    if (!embeddedWallet?.address) return;
    const newBalance = await fetchSolBalance(embeddedWallet.address);
    setBalance(newBalance);
    setRefreshKey((k) => k + 1);
  };

  if (!ready) return null;

  const walletAddress = embeddedWallet?.address ?? "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,0.28),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(245,158,11,0.2),transparent_38%),radial-gradient(circle_at_80%_88%,rgba(34,197,94,0.12),transparent_40%)]" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 pt-8 md:px-8">
        <motion.section
          className="liquid-glass-strong rounded-[2rem] p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/user"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">BlockTix Wallet</p>
                <h1 className="mt-1 text-3xl font-semibold">My Wallet</h1>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </motion.section>

        {!walletAddress && (
          <motion.div
            className="mt-6 liquid-glass-strong rounded-[1.75rem] p-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
          >
            <p className="text-center text-white/70">
              No embedded wallet detected. Please log in with email to create an embedded wallet.
            </p>
          </motion.div>
        )}

        {walletAddress && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6">
              <WalletOverview
                walletAddress={walletAddress}
                isEmbeddedWalletActive={isEmbeddedWalletActive}
                onActivateWallet={onActivateEmbeddedWallet}
              />
              <SendSolForm
                wallet={activeEmbeddedWallet}
                currentBalance={balance}
                onTransferComplete={onTransferComplete}
              />
            </div>
            <div className="space-y-6">
              <TicketGallery tickets={tickets} />
              <TransactionHistory key={refreshKey} walletAddress={walletAddress} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}