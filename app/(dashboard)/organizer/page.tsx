"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import {
  buildAvatarUrl,
  fetchUserProfile,
  type UserProfile,
} from "@/lib/profile";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Coins,
  LogOut,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";

const launchpadActions = [
  {
    title: "Create Event Collection",
    description: "Spin up a Metaplex Core collection for an event and set royalty defaults.",
    icon: Rocket,
    cta: "Create Collection",
  },
  {
    title: "Metadata Studio",
    description: "Upload ticket metadata JSON with seat tier, perks, and access utility traits.",
    icon: Upload,
    cta: "Upload Metadata",
  },
  {
    title: "Ticket Mint Batch",
    description: "Mint seat-class batches with staged release windows for pre-sale and public sale.",
    icon: Ticket,
    cta: "Mint Batch",
  },
  {
    title: "Launch Compliance Check",
    description: "Validate royalties, transfer rules, and freeze controls before going live.",
    icon: ShieldCheck,
    cta: "Run Checks",
  },
] as const;

const liveEvents = [
  { event: "Solstice Sound 2026", sold: 512, supply: 700, revenue: "$43.4K", status: "Live" },
  { event: "Code x Culture Summit", sold: 184, supply: 300, revenue: "$15.6K", status: "Pre-sale" },
  { event: "Midnight Arena Finals", sold: 723, supply: 900, revenue: "$77.8K", status: "Live" },
] as const;

const metaplexIdeas = [
  {
    title: "Programmable Ticket Rules",
    detail:
      "Attach plugins to enforce transfer windows, resale caps, or organizer approval for VIP tiers.",
    tag: "Metaplex Core",
  },
  {
    title: "Dynamic Metadata Reveal",
    detail:
      "Reveal seat assignments or backstage utility at specific block times without reminting assets.",
    tag: "Metadata Updates",
  },
  {
    title: "Compressed Community Passes",
    detail:
      "Issue low-cost cNFT loyalty passes to attendees and convert them into discount gates.",
    tag: "Bubblegum",
  },
  {
    title: "Creator Economy Split",
    detail:
      "Route primary and secondary sales into team multisig and artist royalty wallets automatically.",
    tag: "Royalties",
  },
  {
    title: "Agent-Controlled Vault",
    detail:
      "Use a Core asset signer wallet to automate treasury sweeps, refund windows, and partner payouts.",
    tag: "Agent Registry",
  },
  {
    title: "Drop Queue Automation",
    detail:
      "Integrate Candy Machine style queues for high-demand events and anti-bot mint conditions.",
    tag: "Candy Machine",
  },
] as const;

export default function OrganizerDashboard() {
  const { user, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login/organizer");
  };

  if (!ready || !profile) {
    return (
      <div className="min-h-screen bg-[#060708] text-white flex items-center justify-center">
        <div className="liquid-glass-strong rounded-3xl px-8 py-5 text-sm text-white/80">
          Preparing organizer launchpad...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060708] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(249,115,22,0.26),transparent_36%),radial-gradient(circle_at_88%_0%,rgba(20,184,166,0.18),transparent_35%),radial-gradient(circle_at_78%_86%,rgba(245,158,11,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(transparent_95%,rgba(255,255,255,0.12)_96%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.12)_96%)] [background-size:40px_40px]" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-8 md:px-8">
        <motion.section
          className="liquid-glass-strong rounded-[2rem] p-5 md:p-8"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                <div
                  aria-hidden="true"
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${avatar})` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white/90">
                  {initials}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Event Launchpad</p>
                <h1 className="mt-1 font-display text-4xl italic leading-none tracking-tight text-white md:text-5xl">
                  {displayName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
                  Build and ship programmable tickets with Metaplex standards, then monitor primary sales and secondary royalty flow in one console.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90">
                <Plus className="h-4 w-4" />
                New Event
              </button>
              <button
                onClick={onLogout}
                className="liquid-glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Live Events</p>
              <p className="mt-3 text-3xl font-semibold">7</p>
              <p className="mt-1 text-sm text-emerald-300">+2 this week</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Tickets Minted</p>
              <p className="mt-3 text-3xl font-semibold">14,320</p>
              <p className="mt-1 text-sm text-white/65">Across 12 collections</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Primary Sales</p>
              <p className="mt-3 text-3xl font-semibold">$213.5K</p>
              <p className="mt-1 text-sm text-amber-300">18.4% conversion</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Royalties Earned</p>
              <p className="mt-3 text-3xl font-semibold">$18.2K</p>
              <p className="mt-1 text-sm text-teal-300">Secondary market active</p>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <motion.div
            className="liquid-glass-strong rounded-[1.75rem] p-5 md:p-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-3xl italic tracking-tight">Launch Actions</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/65">
                <Sparkles className="h-3.5 w-3.5" />
                Metaplex-first workflow
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {launchpadActions.map((item) => (
                <article key={item.title} className="liquid-glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <item.icon className="h-5 w-5 text-orange-300" />
                    <button className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10 transition">
                      {item.cta}
                    </button>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.description}</p>
                </article>
              ))}
            </div>
          </motion.div>

          <motion.aside
            className="liquid-glass-strong rounded-[1.75rem] p-5 md:p-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.45 }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl italic tracking-tight">Ticket Sales</h2>
              <ChartNoAxesCombined className="h-5 w-5 text-teal-300" />
            </div>

            <div className="mt-5 grid grid-cols-7 items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
              {[40, 58, 52, 68, 74, 62, 86].map((height, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-orange-500/55 to-teal-300/70"
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[10px] uppercase tracking-wide text-white/50">D{index + 1}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {liveEvents.map((event) => (
                <div key={event.event} className="liquid-glass rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white/92">{event.event}</p>
                    <span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200">
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/65">
                    <span>{event.sold}/{event.supply} sold</span>
                    <span className="text-center">{event.revenue}</span>
                    <span className="text-right">{Math.round((event.sold / event.supply) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        </section>

        <motion.section
          className="mt-6 liquid-glass-strong rounded-[1.75rem] p-5 md:p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl italic tracking-tight">Features That Fit Your Metaplex Vision</h2>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/65">
              <Coins className="h-3.5 w-3.5" />
              Roadmap recommendations
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metaplexIdeas.map((idea) => (
              <article key={idea.title} className="liquid-glass rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/90">{idea.tag}</p>
                <h3 className="mt-2 text-base font-semibold text-white">{idea.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{idea.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="liquid-glass rounded-2xl p-4">
              <CalendarDays className="h-5 w-5 text-orange-300" />
              <p className="mt-3 text-sm text-white/80">Next drop window</p>
              <p className="mt-1 text-xl font-semibold">Apr 18, 14:00 UTC</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <WalletCards className="h-5 w-5 text-teal-300" />
              <p className="mt-3 text-sm text-white/80">Treasury route</p>
              <p className="mt-1 text-xl font-semibold">3 wallet split</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <Users className="h-5 w-5 text-amber-300" />
              <p className="mt-3 text-sm text-white/80">Waitlist demand</p>
              <p className="mt-1 text-xl font-semibold">2,140 users</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4">
              <Ticket className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm text-white/80">Fraud disputes</p>
              <p className="mt-1 text-xl font-semibold">0 unresolved</p>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}