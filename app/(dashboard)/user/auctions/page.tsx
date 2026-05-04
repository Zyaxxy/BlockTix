"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";
import { fetchAuctions, type OrganizerAuction } from "@/lib/auctions";
import { AuctionCreateForm } from "@/app/components/ui/auctions/AuctionCreateForm";
import { AuctionList } from "@/app/components/ui/auctions/AuctionList";

type AuctionTab = "live" | "create";

export default function UserAuctionsPage() {
  const router = useRouter();
  const isLoggedIn = useIsLoggedIn();
  const { user } = useDynamicContext();

  const [ready, setReady] = useState(false);
  const [dynamicUserId, setDynamicUserId] = useState<string | null>(null);
  const [myAuctions, setMyAuctions] = useState<OrganizerAuction[]>([]);
  const [auctions, setAuctions] = useState<OrganizerAuction[]>([]);
  const [activeTab, setActiveTab] = useState<AuctionTab>("live");

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
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

      if (!profile || profile.role !== "user") {
        router.replace("/login");
        return;
      }

      const [allAuctions, createdByMe] = await Promise.all([
        fetchAuctions(),
        fetchAuctions({ creatorUid: uid }),
      ]);
      if (!active) return;

      setDynamicUserId(uid);
      setAuctions(allAuctions);
      setMyAuctions(createdByMe);
      setReady(true);
    };

    load();

    return () => {
      active = false;
    };
  }, [isLoggedIn, router, user?.userId]);

  const onCreated = (auction: OrganizerAuction) => {
    setMyAuctions((current) => [auction, ...current]);
  };

  const visibleAuctions = auctions.filter(
    (auction) => !myAuctions.some((createdAuction) => createdAuction.id === auction.id)
  );

  if (!ready || !dynamicUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08090b] text-white">
        <p className="text-sm text-white/60">Loading auction feed...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090b] px-4 py-8 text-white md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">Marketplace</p>
            <h1 className="text-2xl font-semibold">Live Auction Board</h1>
          </div>
          <Link
            href="/user"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="inline-flex rounded-xl border border-white/15 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              activeTab === "live"
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Live Auctions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              activeTab === "create"
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Create Auction
          </button>
        </div>

        {activeTab === "live" ? (
          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Live Auctions</h2>
            <AuctionList
              auctions={visibleAuctions}
              emptyMessage="No auctions available yet. Check back soon."
            />
          </section>
        ) : (
          <>
            <AuctionCreateForm
              dynamicUserId={dynamicUserId}
              creatorUid={dynamicUserId}
              onCreated={onCreated}
            />

            <section>
              <h2 className="mb-3 text-base font-semibold text-white">Auctions You Created</h2>
              <AuctionList
                auctions={myAuctions}
                emptyMessage="You have not created an auction yet."
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
