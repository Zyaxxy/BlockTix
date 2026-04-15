"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useDynamicContext,
  useEmbeddedWallet,
  useIsLoggedIn,
  useSwitchWallet,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";
import { formatSol } from "@/lib/shared/format";
import {
  fetchLiveEvents,
  fetchUserTicketSales,
  type OrganizerEvent,
  type UserTicketSale,
} from "@/lib/events";
import { MintButton } from "@/app/components/ui/events/MintButton";
import { Check, Copy, LogOut, Ticket, Wallet } from "lucide-react";

const EMAIL_CREDENTIAL_FORMAT = "email";
const PHONE_CREDENTIAL_FORMAT = "phoneNumber";
const BLOCKCHAIN_CREDENTIAL_FORMAT = "blockchain";
const SOL_CHAIN = "SOL";

export default function UserDashboard() {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();
  const { userHasEmbeddedWallet, createEmbeddedWalletAccount } = useEmbeddedWallet();
  const switchWallet = useSwitchWallet();
  const userWallets = useUserWallets();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [ticketSales, setTicketSales] = useState<UserTicketSale[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [walletStatusMessage, setWalletStatusMessage] = useState<string | null>(null);
  const [copiedWalletAddress, setCopiedWalletAddress] = useState(false);
  const [locallyActivatedEmbeddedWalletId, setLocallyActivatedEmbeddedWalletId] = useState<string | null>(
    null
  );
  const [embeddedWalletProvisioning, setEmbeddedWalletProvisioning] = useState<"idle" | "creating" | "done">("idle");
  const [embeddedWalletProvisionAttemptedForUserId, setEmbeddedWalletProvisionAttemptedForUserId] = useState<string | null>(null);

  const safeUserWallets = useMemo(() => {
    return Array.isArray(userWallets) ? userWallets : [];
  }, [userWallets]);

  const wallets = useMemo(
    () => [primaryWallet, ...safeUserWallets].filter(Boolean),
    [primaryWallet, safeUserWallets]
  );

  const hasEmbeddedWallet = useMemo(() => {
    if (typeof userHasEmbeddedWallet !== "function") {
      return false;
    }

    try {
      return Boolean(userHasEmbeddedWallet());
    } catch {
      return false;
    }
  }, [userHasEmbeddedWallet]);

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
        wallet.address?.toLowerCase() === preferredEmbeddedSolCredential?.address?.toLowerCase();
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

  const isEmbeddedWalletLocallyMarkedActive = useMemo(() => {
    if (!embeddedWallet?.id || !locallyActivatedEmbeddedWalletId) return false;
    return embeddedWallet.id === locallyActivatedEmbeddedWalletId;
  }, [embeddedWallet, locallyActivatedEmbeddedWalletId]);

  const isEmbeddedWalletEffectiveActive =
    isEmbeddedWalletActive || isEmbeddedWalletLocallyMarkedActive;

  const shouldOfferEmbeddedWalletCreation = useMemo(() => {
    const verifiedCredentials = user?.verifiedCredentials ?? [];

    if (verifiedCredentials.length === 0) return false;

    const hasBlockchainCredential = verifiedCredentials.some(
      (credential) => credential.format === BLOCKCHAIN_CREDENTIAL_FORMAT
    );
    const hasEmailOrPhoneCredential = verifiedCredentials.some(
      (credential) =>
        credential.format === EMAIL_CREDENTIAL_FORMAT ||
        credential.format === PHONE_CREDENTIAL_FORMAT
    );

    return hasEmailOrPhoneCredential && !hasBlockchainCredential;
  }, [user?.verifiedCredentials]);

  useEffect(() => {
    const uid = user?.userId;

    if (!uid || !isLoggedIn) {
      return;
    }

    if (!shouldOfferEmbeddedWalletCreation || hasEmbeddedWallet) {
      if (embeddedWalletProvisioning !== "idle") {
        setEmbeddedWalletProvisioning("idle");
      }
      return;
    }

    if (embeddedWalletProvisionAttemptedForUserId === uid || embeddedWalletProvisioning === "creating") {
      return;
    }

    if (typeof createEmbeddedWalletAccount !== "function") {
      setEmbeddedWalletProvisionAttemptedForUserId(uid);
      return;
    }

    const ensureEmbeddedWallet = async () => {
      setEmbeddedWalletProvisioning("creating");

      try {
        await createEmbeddedWalletAccount({
          chain: SOL_CHAIN as Parameters<typeof createEmbeddedWalletAccount>[0]["chain"],
        });
        setWalletStatusMessage("Embedded wallet created and ready for minting.");
      } catch (error) {
        setWalletStatusMessage(
          error instanceof Error
            ? `Could not auto-create embedded wallet: ${error.message}`
            : "Could not auto-create embedded wallet right now."
        );
      } finally {
        setEmbeddedWalletProvisionAttemptedForUserId(uid);
        setEmbeddedWalletProvisioning("done");
      }
    };

    ensureEmbeddedWallet();
  }, [
    user?.userId,
    isLoggedIn,
    shouldOfferEmbeddedWalletCreation,
    hasEmbeddedWallet,
    embeddedWalletProvisionAttemptedForUserId,
    embeddedWalletProvisioning,
    createEmbeddedWalletAccount,
  ]);

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

        const walletAddress =
          (wallets.find((wallet) => Boolean((wallet as { address?: string } | null)?.address)) as
            | { address?: string }
            | undefined)?.address ??
          user?.verifiedCredentials?.[0]?.address;

        const [liveEvents, sales] = await Promise.all([
          fetchLiveEvents(),
          walletAddress ? fetchUserTicketSales(walletAddress) : Promise.resolve([]),
        ]);

        if (!active) return;

        setEvents(liveEvents);
        setTicketSales(sales);
        setLoadingEvents(false);
        setReady(true);
      } catch {
        if (!active) return;
        setLoadingEvents(false);
        router.replace("/login");
      }
    };

    checkRole();

    return () => {
      active = false;
    };
  }, [isLoggedIn, user, router, wallets]);

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login");
  };

  const onActivateEmbeddedWallet = async () => {
    if (!embeddedWallet?.id) {
      setWalletStatusMessage("Embedded wallet is missing an id, so it cannot be activated yet.");
      return;
    }

    try {
      await switchWallet(embeddedWallet.id);
      setLocallyActivatedEmbeddedWalletId(embeddedWallet.id);
      setWalletStatusMessage("Embedded wallet activated. You can now sign transactions with it.");
    } catch (error) {
      setWalletStatusMessage(
        error instanceof Error
          ? `Could not activate embedded wallet: ${error.message}`
          : "Could not activate embedded wallet right now."
      );
    }
  };

  const onCopyEmbeddedWalletAddress = async () => {
    if (!embeddedWallet?.address) return;

    try {
      await navigator.clipboard.writeText(embeddedWallet.address);
      setCopiedWalletAddress(true);
      setTimeout(() => setCopiedWalletAddress(false), 1400);
    } catch {
      setWalletStatusMessage("Could not copy wallet address from browser clipboard API.");
    }
  };

  const onMinted = (eventId: string, ticketMint: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    setEvents((current) =>
      current.map((item) =>
        item.id === eventId
          ? { ...item, mintedCount: item.mintedCount + 1 }
          : item
      )
    );

    setTicketSales((current) => [
      {
        id: crypto.randomUUID(),
        eventId,
        eventName: event.name,
        candyMachineId: event.candyMachineId,
        ticketMint,
        priceLamports: event.priceLamports,
        mintedAt: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const totalSpentLamports = useMemo(
    () => ticketSales.reduce((sum, sale) => sum + sale.priceLamports, 0),
    [ticketSales]
  );

  if (!ready) return null;

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
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">BlockTix User</p>
              <h1 className="mt-1 text-3xl font-semibold">Mint Live Event Tickets</h1>
              <p className="mt-2 text-sm text-white/70">
                Browse active drops and mint from Candy Machine directly with your wallet.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Live Events</p>
              <p className="mt-2 text-3xl font-semibold">{events.length}</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Tickets Owned</p>
              <p className="mt-2 text-3xl font-semibold">{ticketSales.length}</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Total Spent</p>
              <p className="mt-2 text-3xl font-semibold">{formatSol(totalSpentLamports)}</p>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            className="liquid-glass-strong rounded-[1.75rem] p-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Live Events</h2>
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>

            <div className="mt-4 space-y-3">
              {loadingEvents && (
                <div className="liquid-glass rounded-xl p-4 text-sm text-white/70">Loading events...</div>
              )}

              {!loadingEvents && events.length === 0 && (
                <div className="liquid-glass rounded-xl p-4 text-sm text-white/70">
                  No live events are available right now.
                </div>
              )}

              {!loadingEvents &&
                events.map((event) => (
                  <article key={event.id} className="liquid-glass rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                        <p className="mt-1 text-sm text-white/65">{event.venue || "Venue TBA"}</p>
                      </div>
                      <MintButton
                        event={event}
                        dynamicUserId={user?.userId ?? ""}
                        wallets={wallets}
                        preferredWalletAddress={
                          embeddedWallet?.address ?? preferredEmbeddedSolCredential?.address
                        }
                        preferredWalletId={
                          embeddedWallet?.id ?? preferredEmbeddedSolCredential?.embeddedWalletId ?? undefined
                        }
                        onMinted={onMinted}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/70">
                      <span>{formatSol(event.priceLamports)}</span>
                      <span className="text-center">
                        {event.mintedCount}/{event.totalSupply} minted
                      </span>
                      <span className="text-right">{event.status}</span>
                    </div>
                  </article>
                ))}
            </div>
          </motion.div>

          <motion.aside
            className="liquid-glass-strong rounded-[1.75rem] p-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
          >
            <div className="liquid-glass rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Wallet</p>
              <p className="mt-2 text-sm text-white/80">
                Embedded wallet: {hasEmbeddedWallet ? "Available" : "Not found"}
              </p>
              <p className="mt-1 text-xs text-white/65">
                {embeddedWallet?.address
                  ? `${embeddedWallet.address.slice(0, 4)}...${embeddedWallet.address.slice(-4)}`
                  : "No embedded Solana wallet address detected yet."}
              </p>
              {embeddedWallet?.address && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="truncate rounded-md border border-white/15 bg-black/25 px-2 py-1 text-[11px] text-white/75">
                    {embeddedWallet.address}
                  </span>
                  <button
                    onClick={onCopyEmbeddedWalletAddress}
                    className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
                  >
                    {copiedWalletAddress ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedWalletAddress ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-white/65">
                Status: {isEmbeddedWalletEffectiveActive ? "Active signer" : "Not active"}
              </p>

              {embeddedWallet?.id && !isEmbeddedWalletEffectiveActive && (
                <button
                  onClick={onActivateEmbeddedWallet}
                  className="mt-3 rounded-full border border-emerald-300/45 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/20"
                >
                  Use Embedded Wallet
                </button>
              )}

              {walletStatusMessage && (
                <p className="mt-2 text-xs text-amber-200">{walletStatusMessage}</p>
              )}

              {!embeddedWallet?.id && shouldOfferEmbeddedWalletCreation && (
                <p className="mt-3 text-[11px] text-white/60">
                  {embeddedWalletProvisioning === "creating"
                    ? "Creating your embedded wallet..."
                    : "Embedded wallet is created automatically for email login users."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">My Tickets</h2>
              <Ticket className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-4 space-y-2">
              {ticketSales.length === 0 && (
                <div className="liquid-glass rounded-xl p-4 text-sm text-white/70">
                  Your minted tickets will appear here.
                </div>
              )}

              {ticketSales.map((sale) => (
                <div key={sale.id} className="liquid-glass rounded-xl p-3">
                  <p className="text-sm font-medium text-white/90">{sale.eventName ?? "Unnamed Event"}</p>
                  <p className="mt-1 text-xs text-white/65">Mint: {sale.ticketMint.slice(0, 4)}...{sale.ticketMint.slice(-4)}</p>
                  <p className="mt-1 text-xs text-emerald-300">Paid: {formatSol(sale.priceLamports)}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </section>
      </main>
    </div>
  );
}