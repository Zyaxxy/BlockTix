"use client";

import Link from "next/link";
import type { OrganizerAuction } from "@/lib/auctions";

type AuctionListProps = {
  auctions: OrganizerAuction[];
  emptyMessage: string;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

export function AuctionList({ auctions, emptyMessage }: AuctionListProps) {
  if (!auctions.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/60">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {auctions.map((auction) => (
        <article
          key={auction.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                {auction.title ?? `Auction #${auction.seed}`}
              </h3>
              <p className="text-xs text-white/60">
                Ends {formatDate(auction.endTime)} • Status: {auction.status}
              </p>
            </div>
            <Link
              href={`/auctions/${auction.id}`}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Open
            </Link>
          </div>
          {auction.description ? (
            <p className="mt-2 text-sm text-white/70">{auction.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-white/50">Highest bid: {auction.highestBidAmount ?? 0}</p>
        </article>
      ))}
    </div>
  );
}
