"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  useDynamicContext,
  useIsLoggedIn,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import {
  buildAvatarUrl,
  fetchUserProfile,
  type UserProfile,
} from "@/lib/profile";
import { formatSol } from "@/lib/shared/format";
import {
  fetchOrganizerEvents,
  type OrganizerEvent,
} from "@/lib/events";
import { CreateEventForm } from "@/app/components/ui/events/CreateEventForm";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  LogOut,
  MoreHorizontal,
  Package,
  Plus,
  Ticket,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type EventFilter = "all" | "live" | "draft" | "ended";

const statusConfig: Record<OrganizerEvent["status"], { label: string; color: string; bgColor: string }> = {
  draft: { label: "Draft", color: "text-zinc-400", bgColor: "bg-zinc-400/10 border-zinc-400/20" },
  live: { label: "Live", color: "text-emerald-400", bgColor: "bg-emerald-400/10 border-emerald-400/20" },
  pre_sale: { label: "Pre-sale", color: "text-amber-400", bgColor: "bg-amber-400/10 border-amber-400/20" },
  sold_out: { label: "Sold Out", color: "text-rose-400", bgColor: "bg-rose-400/10 border-rose-400/20" },
  ended: { label: "Ended", color: "text-zinc-500", bgColor: "bg-zinc-500/10 border-zinc-500/20" },
  cancelled: { label: "Cancelled", color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/20" },
};

export default function OrganizerDashboard() {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("all");

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login/organizer");
      return;
    }

    const uid = user?.userId;
    if (!uid) return;

    let active = true;

    const checkRole = async () => {
      const data = await fetchUserProfile(uid);

      if (!active) return;

      if (!data) {
        router.replace("/login/organizer");
        return;
      }

      if (data.role !== "organizer") {
        router.replace("/user");
        return;
      }

      const organizerEvents = await fetchOrganizerEvents(uid);
      if (!active) return;

      setEvents(organizerEvents);
      setProfile(data);
      setReady(true);
    };

    checkRole();

    return () => {
      active = false;
    };
  }, [isLoggedIn, user, router]);

  const displayName = profile?.name ?? "Organizer";
  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [displayName]
  );
  const avatar = profile?.avatarUrl ?? buildAvatarUrl(displayName || user?.userId || "blocktix");

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    if (activeFilter === "live") return events.filter((e) => e.status === "live" || e.status === "pre_sale");
    return events.filter((e) => e.status === activeFilter);
  }, [events, activeFilter]);

  const stats = useMemo(() => {
    const live = events.filter((e) => e.status === "live" || e.status === "pre_sale").length;
    const totalMinted = events.reduce((sum, e) => sum + e.mintedCount, 0);
    const totalSupply = events.reduce((sum, e) => sum + e.totalSupply, 0);
    const totalRevenue = events.reduce((sum, e) => sum + e.mintedCount * e.priceLamports, 0);
    const conversionRate = totalSupply > 0 ? Math.round((totalMinted / totalSupply) * 100) : 0;

    return { live, totalMinted, totalSupply, totalRevenue, conversionRate };
  }, [events]);

  const wallets = useMemo(
    () => [primaryWallet, ...userWallets].filter(Boolean),
    [primaryWallet, userWallets]
  );

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login/organizer");
  };

  const onCreatedEvent = (event: OrganizerEvent) => {
    setEvents((current) => [event, ...current]);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (!ready || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-sm text-white/60">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_50%)]" />

      <main className="relative mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-amber-500/10">
              <div
                aria-hidden="true"
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${avatar})` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">
                {initials}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Event Launchpad</p>
              <h1 className="text-2xl font-semibold text-white">{displayName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/organizer/auctions"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
            >
              Auctions
            </Link>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">Live Events</p>
                <p className="mt-1 text-2xl font-semibold">{stats.live}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5">
                <Ticket className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">Tickets Sold</p>
                <p className="mt-1 text-2xl font-semibold">{stats.totalMinted.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2.5">
                <DollarSign className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">Revenue</p>
                <p className="mt-1 text-2xl font-semibold">{formatSol(stats.totalRevenue)} </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">Sell-through</p>
                <p className="mt-1 text-2xl font-semibold">{stats.conversionRate}%</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Events Section */}
        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Your Events</h2>

            <div className="flex flex-wrap gap-2">
              {(["all", "live", "draft", "ended"] as EventFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeFilter === filter
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              {filteredEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center"
                >
                  <Package className="mx-auto h-12 w-12 text-white/20" />
                  <p className="mt-4 text-lg font-medium text-white/60">
                    {activeFilter === "all" ? "No events yet" : `No ${activeFilter} events`}
                  </p>
                  <p className="mt-2 text-sm text-white/40">
                    {activeFilter === "all"
                      ? "Create your first event to start selling tickets on-chain."
                      : "Try a different filter or create a new event."}
                  </p>
                  {activeFilter === "all" && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
                    >
                      <Plus className="h-4 w-4" />
                      Create Event
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-3"
                >
                  {filteredEvents.map((event, index) => {
                    const status = statusConfig[event.status];
                    const progress = event.totalSupply > 0
                      ? Math.round((event.mintedCount / event.totalSupply) * 100)
                      : 0;

                    return (
                      <motion.article
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition hover:border-white/10 hover:bg-white/[0.03]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.color} ${status.bgColor}`}>
                                {status.label}
                              </span>
                            </div>

                            {event.venue && (
                              <p className="mt-1 text-sm text-white/50">{event.venue}</p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/60">
                              {event.eventDate && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4 text-white/40" />
                                  {formatDate(event.eventDate)}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5">
                                <Ticket className="h-4 w-4 text-white/40" />
                                {event.mintedCount.toLocaleString()} / {event.totalSupply.toLocaleString()} sold
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4 text-white/40" />
                                {formatSol(event.priceLamports)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 lg:gap-6">
                            {/* Progress Ring */}
                            <div className="flex items-center gap-3">
                              <div className="relative h-14 w-14">
                                <svg className="h-14 w-14 -rotate-90 transform">
                                  <circle
                                    cx="28"
                                    cy="28"
                                    r="24"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className="text-white/5"
                                  />
                                  <circle
                                    cx="28"
                                    cy="28"
                                    r="24"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${progress * 1.51} 151`}
                                    strokeLinecap="round"
                                    className={progress >= 80 ? "text-emerald-400" : progress >= 50 ? "text-amber-400" : "text-blue-400"}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-semibold">{progress}%</span>
                                </div>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-sm font-medium">{formatSol(event.mintedCount * event.priceLamports)} </p>
                                <p className="text-xs text-white/40">Revenue</p>
                              </div>
                            </div>

                            <button className="rounded-lg border border-white/10 p-2 text-white/50 transition hover:bg-white/5 hover:text-white/70">
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Quick Tips - Only show when no events */}
        {events.length === 0 && (
          <section className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-lg font-semibold">Quick Start Guide</h3>
            <p className="mt-2 text-sm text-white/60">
              Create your first event to launch an on-chain ticket sale. Each event deploys a Metaplex Candy Machine
              for NFT ticket minting with built-in royalty enforcement.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-emerald-400">Step 1</div>
                <p className="mt-1 text-sm font-semibold">Create Event</p>
                <p className="mt-1 text-xs text-white/50">Set name, venue, and ticket details</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-amber-400">Step 2</div>
                <p className="mt-1 text-sm font-semibold">Deploy On-Chain</p>
                <p className="mt-1 text-xs text-white/50">Candy Machine creates your collection</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-blue-400">Step 3</div>
                <p className="mt-1 text-sm font-semibold">Share & Sell</p>
                <p className="mt-1 text-xs text-white/50">Attendees mint tickets directly</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {profile && (
        <CreateEventForm
          open={isCreateModalOpen}
          dynamicUserId={user?.userId ?? profile.uid}
          organizerUid={profile.uid}
          wallets={wallets}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={onCreatedEvent}
        />
      )}
    </div>
  );
}