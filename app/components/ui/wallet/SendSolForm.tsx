"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { sendSol, isValidSolanaAddress } from "@/lib/solana/transfer";
import { solToInr, inrToSol } from "@/lib/solana/conversions";

import type { DynamicWalletLike } from "@/lib/solana/candy-machine";

type SendSolFormProps = {
  wallet: DynamicWalletLike | null;
  currentBalance: number | null;
  onTransferComplete?: (signature: string) => void;
};

export function SendSolForm({
  wallet,
  currentBalance,
  onTransferComplete,
}: SendSolFormProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState(""); // This amount is entered in INR

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amountInInr = parseFloat(amount);
  const amountInSol = inrToSol(amountInInr);
  const currentBalanceInInr = currentBalance !== null ? solToInr(currentBalance) : null;

  const isValidAmount = !isNaN(amountInInr) && amountInInr > 0;
  const isValidRecipient = isValidSolanaAddress(recipientAddress);
  const hasSufficientBalance =
    currentBalanceInInr !== null && isValidAmount && amountInInr <= currentBalanceInInr;
  const canSend = wallet && isValidAmount && isValidRecipient && hasSufficientBalance && !sending;


  const handleSend = useCallback(async () => {
    if (!canSend || !wallet) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await sendSol(wallet, recipientAddress, amountInSol);
      setSuccess(`Sent INR ${amountInInr.toFixed(2)} rupees! Signature: ${result.signature.slice(0, 8)}...`);

      setAmount("");
      setRecipientAddress("");
      onTransferComplete?.(result.signature);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send SOL");
    } finally {
      setSending(false);
    }
  }, [canSend, wallet, recipientAddress, amountInSol, amountInInr, onTransferComplete]);

  const setMaxAmount = useCallback(() => {
    if (currentBalance !== null && currentBalance > 0) {
      const maxSendSol = Math.max(0, currentBalance - 0.00001);
      const maxSendInr = solToInr(maxSendSol);
      setAmount(maxSendInr.toFixed(2));
    }
  }, [currentBalance]);


  return (
    <motion.div
      className="liquid-glass-strong rounded-[1.75rem] p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Send Funds</h2>
        <Send className="h-5 w-5 text-emerald-300" />
      </div>


      <div className="mt-4 space-y-4">
        <div className="liquid-glass rounded-xl p-4">
          <label className="block text-xs uppercase tracking-[0.16em] text-white/50 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter Solana wallet address"
            className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-emerald-300/50 focus:outline-none"
          />
          {recipientAddress && !isValidRecipient && (
            <p className="mt-1 text-xs text-red-400">Invalid Solana address</p>
          )}
        </div>

        <div className="liquid-glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-[0.16em] text-white/50">
              Amount (INR)
            </label>

            <button
              onClick={setMaxAmount}
              className="text-xs text-emerald-300 hover:text-emerald-200"
            >
              Max
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.000000001"
            min="0"
            className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-emerald-300/50 focus:outline-none"
          />
          {currentBalanceInInr !== null && (
            <p className="mt-1 text-xs text-white/50">
              Available: INR {currentBalanceInInr.toFixed(2)} (~ {currentBalance?.toFixed(4)} SOL)
            </p>
          )}

          {amount && isValidAmount && (
            <p className="mt-1 text-xs text-white/45">~ {amountInSol.toFixed(6)} SOL</p>
          )}

          {amount && isValidAmount && !hasSufficientBalance && (
            <p className="mt-1 text-xs text-red-400">Insufficient balance</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full rounded-full border border-emerald-300/45 bg-emerald-300/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Funds
            </>

          )}
        </button>

        <p className="text-xs text-white/40 text-center">
          Transactions are processed on Solana and may take a few seconds to confirm.
        </p>
      </div>
    </motion.div>
  );
}