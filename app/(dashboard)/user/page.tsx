"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDynamicContext,
  useEmbeddedWallet,
  useIsLoggedIn,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";
import { formatSol } from "@/lib/shared/format";
import { fetchLiveEvents, type OrganizerEvent } from "@/lib/events";
import { MintButton } from "@/app/components/ui/events/MintButton";

const EMAIL_CREDENTIAL_FORMAT = "email";
const PHONE_CREDENTIAL_FORMAT = "phoneNumber";
const BLOCKCHAIN_CREDENTIAL_FORMAT = "blockchain";
const SOL_CHAIN = "SOL";
const FALLBACK_EVENT_IMAGE =
  "https://dummyimage.com/1200x630/0b0f14/ffffff&text=BlockTix";

const formatEventDate = (value: string | null) => {
  if (!value) return "Date TBA";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date TBA";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function UserDashboard() {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();
  const { userHasEmbeddedWallet, createEmbeddedWalletAccount } = useEmbeddedWallet();
  const userWallets = useUserWallets();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
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
      } catch (error) {
        console.error("Could not auto-create embedded wallet.", error);
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

        const liveEvents = await fetchLiveEvents();
        if (!active) return;

        setEvents(liveEvents);
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
  }, [isLoggedIn, user?.userId, router]);

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login");
  };

  const onMinted = (eventId: string) => {
    setEvents((current) =>
      current.map((item) =>
        item.id === eventId
          ? { ...item, mintedCount: item.mintedCount + 1 }
          : item
      )
    );
  };

  const navLinks = [
    { href: "/user", label: "Live Events", active: true },
    { href: "/user/tickets", label: "My Tickets", active: false },
    { href: "/user/auctions", label: "Auctions", active: false },
    ...(hasEmbeddedWallet ? [{ href: "/user/wallet", label: "Wallet", active: false }] : []),
  ];

  if (!ready) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,0.28),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(245,158,11,0.2),transparent_38%),radial-gradient(circle_at_80%_88%,rgba(34,197,94,0.12),transparent_40%)]" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 pt-8 md:px-8">
        <motion.header
          className="liquid-glass-strong rounded-pill p-3 md:p-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="liquid-glass rounded-pill flex items-center gap-1 px-1.5 py-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={[
                      "rounded-pill px-3 py-1.5 text-sm transition",
                      link.active
                        ? "bg-white font-semibold text-black shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              {embeddedWalletProvisioning === "creating" && (
                <span className="rounded-pill border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/65">
                  Setting up wallet
                </span>
              )}
              <button
                onClick={onLogout}
                className="inline-flex rounded-pill bg-white px-4 py-2 text-sm font-semibold text-black shadow-[0_8px_22px_rgba(0,0,0,0.22)] transition hover:bg-white/90"
              >
                Logout
              </button>
            </div>
          </div>
        </motion.header>

        <section className="mt-6">
          <motion.div
            className="liquid-glass-strong rounded-[1.75rem] p-5 md:p-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-emerald-100/65">Now Showing</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Live Events</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {loadingEvents && (
                <div className="liquid-glass rounded-2xl p-4 text-sm text-white/70 md:col-span-2">Loading events...</div>
              )}

              {!loadingEvents && events.length === 0 && (
                <div className="liquid-glass rounded-2xl p-4 text-sm text-white/70 md:col-span-2">
                  No live events are available right now.
                </div>
              )}

              {!loadingEvents &&
                events.map((event) => (
                  <article
                    key={event.id}
                    className="group relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-black/45 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:border-emerald-200/40 hover:shadow-[0_28px_70px_rgba(16,185,129,0.2)]"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(circle_at_90%_0%,rgba(252,211,77,0.2),transparent_34%),radial-gradient(circle_at_6%_92%,rgba(16,185,129,0.22),transparent_44%)] opacity-75 transition group-hover:opacity-100"
                    />
                    <div
                      aria-hidden="true"
                      className="relative h-40 w-full overflow-hidden rounded-xl border border-white/15 bg-black/25"
                    >
                      <div
                        className="h-full w-full scale-105 bg-cover bg-center transition duration-500 group-hover:scale-110"
                        style={{
                          backgroundImage: `url(${event.imageUrl || FALLBACK_EVENT_IMAGE})`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030405]/80 via-black/10 to-transparent" />
                      <div className="absolute left-3 top-3 inline-flex rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/80">
                        {formatEventDate(event.eventDate)}
                      </div>
                    </div>

                    <div className="relative mt-4 space-y-3.5">
                      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
                        <h3 className="truncate text-lg font-semibold tracking-tight text-white">{event.name}</h3>
                        <span className="min-w-[4.75rem] text-right font-display text-[1.02rem] font-semibold leading-none tracking-tight text-white">
                          {formatSol(event.priceLamports)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-white/70">{event.venue || "Venue TBA"}</p>
                      <div className="grid gap-y-1 text-xs text-white/70 sm:grid-cols-2 sm:gap-x-6">
                        <p className="truncate">
                          <span className="text-white/55">Sold:</span> {event.mintedCount}/{event.totalSupply}
                        </p>
                        <p className="truncate sm:text-right">
                          <span className="text-white/55">Status:</span>{" "}
                          <span className="uppercase tracking-[0.12em] text-white/70">{event.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-4 flex items-center justify-between gap-3">
                      <span className="text-[0.68rem] uppercase tracking-[0.16em] text-white/55">Live drop</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/events/${event.id}`}
                          className="rounded-pill inline-flex border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:bg-white/15 hover:text-white"
                        >
                          View details
                        </Link>
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
                    </div>
                  </article>
                ))}
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
