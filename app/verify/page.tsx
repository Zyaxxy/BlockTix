"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import { verifyTicketByMint } from "@/lib/events";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Camera,
    ShieldCheck,
    ArrowLeft,
    Ticket,
    Search,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcEndpoint } from "@/lib/solana/candy-machine";

export default function VerificationScannerPage() {
    const [scanResult, setScanResult] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualMint, setManualMint] = useState("");
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scannerRef.current.render(onScanSuccess, onScanFailure);

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []);

    async function onScanSuccess(decodedText: string) {
        try {
            // Data is expected to be a JSON string
            const data = JSON.parse(decodedText);
            if (data.type === "soltix-ticket" && data.mint) {
                handleVerification(data.mint);
            } else {
                setError("Invalid QR format: Missing mint address.");
            }
        } catch (e) {
            // If not JSON, try to treat the whole text as a mint address
            if (decodedText.length >= 32 && decodedText.length <= 44) {
                handleVerification(decodedText);
            } else {
                setError("Could not parse QR code data.");
            }
        }
    }

    function onScanFailure(error: any) {
        // We don't want to spam errors during continuous scanning
        // console.warn(`Code scan error = ${error}`);
    }

    const handleVerification = async (mint: string) => {
        if (isVerifying) return;
        setIsVerifying(true);
        setError(null);
        setScanResult(null);

        try {
            // 1. Verify in DB
            const ticket = await verifyTicketByMint(mint);
            if (!ticket) {
                setError("Ticket not found in SOLTix records.");
                return;
            }

            // 2. Verify On-Chain
            const rpc = getRpcEndpoint();
            const connection = new Connection(rpc);
            const mintPubkey = new PublicKey(mint);

            // Get the largest accounts (the one with the NFT)
            const tokenAccounts = await connection.getTokenLargestAccounts(mintPubkey);
            if (tokenAccounts.value.length === 0) {
                setError("On-chain record for this mint not found.");
                return;
            }

            const largestAccount = tokenAccounts.value[0].address;
            const accountInfo = await connection.getParsedAccountInfo(largestAccount);

            const parsedData = (accountInfo.value?.data as any)?.parsed;
            const currentOwner = parsedData?.info?.owner;

            if (!currentOwner) {
                setError("Could not determine current on-chain owner.");
                return;
            }

            setScanResult({
                ...ticket,
                onChainOwner: currentOwner,
                verifiedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error("Verification error:", err);
            setError("An error occurred during verification. Please check the mint address.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReset = () => {
        setScanResult(null);
        setError(null);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#07090d] text-white font-figtree">
            {/* Background Orbs */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_80%,rgba(16,185,129,0.1),transparent_34%),radial-gradient(circle_at_86%_88%,rgba(245,158,11,0.08),transparent_38%)]" />

            <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 pt-8 md:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <Link
                        href="/user/tickets"
                        className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">My Tickets</span>
                    </Link>

                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Official Scanner
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <ShieldCheck className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Ticket Verification</h1>
                    <p className="text-white/50">Scan the ticket QR code to verify its authenticity.</p>
                </motion.div>

                <div className="space-y-6">
                    {/* Scanner Container */}
                    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0c0f16] p-4 shadow-2xl">
                        {isVerifying ? (
                            <div className="aspect-square w-full flex flex-col items-center justify-center bg-black/40 rounded-2xl">
                                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                                <p className="text-emerald-400 font-medium animate-pulse">Verifying on-chain...</p>
                            </div>
                        ) : scanResult ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="aspect-square w-full flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-emerald-400 mb-2">Verified Ticket</h2>
                                <div className="space-y-1 mb-8">
                                    <p className="text-xl font-semibold">{scanResult.eventName}</p>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-white/40 text-xs font-mono">MINT: {scanResult.ticketMint.slice(0, 8)}...{scanResult.ticketMint.slice(-8)}</p>
                                        <p className="text-emerald-500/60 text-[10px] font-mono">OWNER: {scanResult.onChainOwner.slice(0, 8)}...{scanResult.onChainOwner.slice(-8)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full">
                                    <Link
                                        href={`https://explorer.solana.com/address/${scanResult.ticketMint}?cluster=devnet`}
                                        target="_blank"
                                        className="flex items-center justify-center gap-2 text-xs text-white/30 hover:text-white transition-colors"
                                    >
                                        View on Explorer
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    <button
                                        onClick={handleReset}
                                        className="w-full rounded-full bg-white/10 border border-white/10 px-8 py-3 text-sm font-bold hover:bg-white/20 transition-all"
                                    >
                                        Scan Another
                                    </button>
                                </div>
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="aspect-square w-full flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="h-24 w-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                                    <XCircle className="h-12 w-12 text-red-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-red-500 mb-2">Invalid Ticket</h2>
                                <p className="text-white/50 mb-8">{error}</p>
                                <button
                                    onClick={handleReset}
                                    className="rounded-full bg-white/10 border border-white/10 px-8 py-3 text-sm font-bold hover:bg-white/20 transition-all"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        ) : (
                            <>
                                <div id="reader" className="overflow-hidden rounded-2xl border border-white/5" />
                                <div className="mt-4 flex items-center justify-center gap-2 text-white/30 text-xs">
                                    <Camera className="h-3 w-3" />
                                    <span>Align QR code within the frame</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Manual Input */}
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Manual Entry</h3>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                <input
                                    type="text"
                                    placeholder="Paste Ticket Mint Address..."
                                    value={manualMint}
                                    onChange={(e) => setManualMint(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => handleVerification(manualMint)}
                                disabled={!manualMint || isVerifying}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black px-6 py-3 rounded-2xl text-sm font-bold transition-all shrink-0"
                            >
                                Verify
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
        #reader {
          border: none !important;
          background: transparent !important;
        }
        #reader video {
          border-radius: 1rem;
        }
        #reader__dashboard_section_csr button {
          background-color: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 9999px !important;
          padding: 0.5rem 1.5rem !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        #reader__dashboard_section_csr button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        #reader__status_span {
          color: rgba(255, 255, 255, 0.4) !important;
          font-size: 0.75rem !important;
        }
      `}</style>
        </div>
    );
}
