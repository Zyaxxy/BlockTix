"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Copy, Check, Wallet } from "lucide-react";
import { fetchSolBalance } from "@/lib/solana/balance";
import { solToInr } from "@/lib/solana/conversions";


type WalletOverviewProps = {
  walletAddress: string;
  isEmbeddedWalletActive: boolean;
  onActivateWallet: () => Promise<void>;
};

export function WalletOverview({
  walletAddress,
  isEmbeddedWalletActive,
  onActivateWallet,
}: WalletOverviewProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const solBalance = await fetchSolBalance(walletAddress);
      setBalance(solBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 1400);
    } catch {
      setError("Failed to copy address");
    }
  };

  const handleActivateWallet = async () => {
    setActivating(true);
    setError(null);
    try {
      await onActivateWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate wallet");
    } finally {
      setActivating(false);
    }
  };

  return (
    <motion.div
      className="liquid-glass-strong rounded-[1.75rem] p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Wallet</h2>
        <Wallet className="h-5 w-5 text-emerald-300" />
      </div>

      <div className="mt-4 liquid-glass rounded-xl p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">Address</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="truncate rounded-md border border-white/15 bg-black/25 px-2 py-1 text-sm text-white/75">
            {walletAddress}
          </span>
          <button
            onClick={copyAddress}
            className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            {copiedAddress ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copiedAddress ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="mt-3 text-xs text-white/65">
          Status: {isEmbeddedWalletActive ? "Active signer" : "Not active"}
        </p>

        {!isEmbeddedWalletActive && (
          <button
            onClick={handleActivateWallet}
            disabled={activating}
            className="mt-3 rounded-full border border-emerald-300/45 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-50"
          >
            {activating ? "Activating..." : "Use Embedded Wallet"}
          </button>
        )}
      </div>

      <div className="mt-4 liquid-glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-white/50">Balance</p>
          <button
            onClick={refreshBalance}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <p className="mt-2 text-3xl font-semibold">
          {balance !== null ? `INR ${solToInr(balance).toFixed(2)}` : "—"}
        </p>
        {balance !== null && (
          <p className="mt-1 text-xs text-white/55">~ {balance.toFixed(4)} SOL</p>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </motion.div>
  );
}