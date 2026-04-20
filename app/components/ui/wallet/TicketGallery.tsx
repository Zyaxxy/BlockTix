"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { formatSol } from "@/lib/shared/format";
import type { UserTicketSale } from "@/lib/events";

type TicketGalleryProps = {
  tickets: UserTicketSale[];
};

export function TicketGallery({ tickets }: TicketGalleryProps) {
  return (
    <motion.div
      className="liquid-glass-strong rounded-[1.75rem] p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">My Tickets</h2>
        <Ticket className="h-5 w-5 text-amber-300" />
      </div>

      <div className="mt-4 space-y-2">
        {tickets.length === 0 && (
          <div className="liquid-glass rounded-xl p-4 text-sm text-white/70">
            Your minted tickets will appear here.
          </div>
        )}

        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="liquid-glass rounded-xl p-4 transition hover:bg-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-medium text-white/90 truncate">
                  {ticket.eventName ?? "Unnamed Event"}
                </p>
                <p className="mt-1 text-xs text-white/65">
                  Mint: {ticket.ticketMint.slice(0, 8)}...{ticket.ticketMint.slice(-8)}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {new Date(ticket.mintedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-300">
                  {formatSol(ticket.priceLamports)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Link
                href={`/events/${ticket.eventId}`}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                View Event
              </Link>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}