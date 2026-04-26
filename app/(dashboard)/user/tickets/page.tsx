"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    useDynamicContext,
    useIsLoggedIn
} from "@dynamic-labs/sdk-react-core";
import { useRouter } from "next/navigation";
import { fetchUserTicketSales, type UserTicketSale } from "@/lib/events";
import { formatSol } from "@/lib/shared/format";
import {
    Ticket,
    QrCode,
    X,
    Calendar,
    MapPin,
    ArrowLeft,
    ChevronRight,
    Info,
    CheckCircle2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

export default function MyTicketsPage() {
    const { user, primaryWallet } = useDynamicContext();
    const isLoggedIn = useIsLoggedIn();
    const router = useRouter();

    const [tickets, setTickets] = useState<UserTicketSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<UserTicketSale | null>(null);

    useEffect(() => {
        if (!isLoggedIn) {
            router.push("/login");
            return;
        }

        const loadTickets = async () => {
            const walletAddress = primaryWallet?.address || user?.verifiedCredentials?.[0]?.address;
            if (!walletAddress) return;

            try {
                const sales = await fetchUserTicketSales(walletAddress);
                setTickets(sales);
            } catch (error) {
                console.error("Failed to fetch tickets:", error);
            } finally {
                setLoading(false);
            }
        };

        loadTickets();
    }, [isLoggedIn, user, primaryWallet, router]);

    const qrData = useMemo(() => {
        if (!selectedTicket) return "";
        return JSON.stringify({
            type: "soltix-ticket",
            mint: selectedTicket.ticketMint,
            eventId: selectedTicket.eventId,
            owner: primaryWallet?.address || user?.verifiedCredentials?.[0]?.address,
            v: "1.0"
        });
    }, [selectedTicket, primaryWallet, user]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#07090d] text-white font-figtree">
            {/* Background Orbs */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,0.15),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(245,158,11,0.12),transparent_38%),radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.05),transparent_40%)]" />

            <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <Link
                        href="/user"
                        className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Back to Profile</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/verify"
                            className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                            <QrCode className="h-4 w-4" />
                            Scanner
                        </Link>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent mb-2">
                        My Tickets
                    </h1>
                    <p className="text-white/50 text-lg mb-8">
                        Manage your digital assets and event admissions.
                    </p>
                </motion.div>

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-[2.5rem] bg-white/5 border border-white/10">
                        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <Ticket className="h-10 w-10 text-white/20" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
                        <p className="text-white/40 text-center max-w-xs mb-8">
                            You haven't minted any tickets yet. Explore live events to get started.
                        </p>
                        <Link
                            href="/user"
                            className="rounded-full bg-white text-black px-8 py-3 font-semibold hover:bg-white/90 transition-all"
                        >
                            Explore Events
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {tickets.map((ticket, index) => (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                whileHover={{ y: -4 }}
                                onClick={() => setSelectedTicket(ticket)}
                                className="group relative cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] blur-xl" />

                                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0c0f16] p-6 transition-all group-hover:border-white/20">
                                    <div className="flex gap-5">
                                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Ticket className="h-8 w-8 text-white/20" />
                                            </div>
                                            {/* We'd normally use ticket metadata imageUrl here */}
                                        </div>

                                        <div className="flex flex-col justify-between py-1">
                                            <div>
                                                <h3 className="text-xl font-bold line-clamp-1">{ticket.eventName}</h3>
                                                <div className="mt-2 flex items-center gap-4 text-sm text-white/50">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span>{new Date(ticket.mintedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                                    Verified Ticket
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Ticket ID</span>
                                            <span className="text-sm font-mono text-white/70">
                                                {ticket.ticketMint.slice(0, 10)}...{ticket.ticketMint.slice(-8)}
                                            </span>
                                        </div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                            <QrCode className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* QR Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTicket(null)}
                            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="relative w-full max-w-sm rounded-[3rem] bg-[#0c0f16] border border-white/10 p-8 shadow-2xl pointer-events-auto overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="text-center mb-8">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-1">{selectedTicket.eventName}</h2>
                                    <p className="text-white/50 text-sm">Valid Admission Ticket</p>
                                </div>

                                <div className="relative aspect-square w-full rounded-2xl bg-white p-6 shadow-xl mb-8">
                                    <QRCodeSVG
                                        value={qrData}
                                        size={200}
                                        level="H"
                                        includeMargin={false}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white p-1 rounded-lg">
                                            <div className="bg-emerald-500 h-8 w-8 rounded flex items-center justify-center">
                                                <Ticket className="h-5 w-5 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5">
                                            <Info className="h-5 w-5 text-white/40" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Verification Data</span>
                                            <span className="text-xs font-mono text-white/60">
                                                HASH: {selectedTicket.ticketMint.slice(0, 16)}...
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-center text-white/30 uppercase tracking-[0.2em] font-medium py-2">
                                        Secured by SOLTix Protocol
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
