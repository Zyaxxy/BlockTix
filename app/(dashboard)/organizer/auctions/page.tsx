"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";
import { fetchOrganizerEvents, type OrganizerEvent } from "@/lib/events";
import { fetchAuctions, type OrganizerAuction } from "@/lib/auctions";
import { AuctionCreateForm } from "@/app/components/ui/auctions/AuctionCreateForm";
import { AuctionList } from "@/app/components/ui/auctions/AuctionList";

export default function OrganizerAuctionsPage() {
  const router = useRouter();
  const isLoggedIn = useIsLoggedIn();
  const { user } = useDynamicContext();

  const [ready, setReady] = useState(false);
  const [dynamicUserId, setDynamicUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [auctions, setAuctions] = useState<OrganizerAuction[]>([]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login/organizer");
      return;
    }

    const uid = user?.userId;
    if (!uid) {
      return;
    }

    let active = true;

    const load = async () => {
      const profile = await fetchUserProfile(uid);
      if (!active) return;

      if (!profile || profile.role !== "organizer") {
        router.replace("/login/organizer");
        return;
      }

      const [organizerEvents, organizerAuctions] = await Promise.all([
        fetchOrganizerEvents(uid),
        fetchAuctions({ organizerUid: uid }),
      ]);

      if (!active) return;

      setDynamicUserId(uid);
      setEvents(organizerEvents);
      setAuctions(organizerAuctions);
      setReady(true);
    };

    load();

    return () => {
      active = false;
    };
  }, [isLoggedIn, router, user?.userId]);

  const onCreated = (auction: OrganizerAuction) => {
    setAuctions((current) => [auction, ...current]);
  };

  if (!ready || !dynamicUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] text-white">
        <p className="text-sm text-white/60">Loading auctions workspace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0b0d] px-4 py-8 text-white md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">Organizer Auctions</p>
            <h1 className="text-2xl font-semibold">Auction Control Room</h1>
          </div>
          <Link
            href="/organizer"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Back to Dashboard
          </Link>
        </div>

        <AuctionCreateForm
          dynamicUserId={dynamicUserId}
          organizerUid={dynamicUserId}
          events={events}
          onCreated={onCreated}
        />

        <section>
          <h2 className="mb-3 text-base font-semibold text-white">Your Auctions</h2>
          <AuctionList
            auctions={auctions}
            emptyMessage="No auctions created yet. Create one to start accepting bids."
          />
        </section>
      </div>
    </main>
  );
}
