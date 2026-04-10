"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useDynamicContext,
  useIsLoggedIn,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";
import {
  fetchLiveEvents,
  fetchUserTicketSales,
  type OrganizerEvent,
  type UserTicketSale,
} from "@/lib/events";
import { MintButton } from "@/app/components/ui/events/MintButton";
import { LogOut, Ticket, Wallet } from "lucide-react";

export default function UserDashboard() {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [ticketSales, setTicketSales] = useState<UserTicketSale[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const wallets = useMemo(
    () => [primaryWallet, ...userWallets].filter(Boolean),
    [primaryWallet, userWallets]
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const uid = user?.userId;
    if (!uid) return;

    const checkRole = async () => {
      const data = await fetchUserProfile(uid);

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

      setEvents(liveEvents);
      setTicketSales(sales);
      setLoadingEvents(false);
      setReady(true);
    };

    checkRole();
  }, [isLoggedIn, user, router, wallets]);

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login");
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

  const formatSol = (lamports: number) =>
    `${(lamports / 1_000_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} SOL`;

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
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
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