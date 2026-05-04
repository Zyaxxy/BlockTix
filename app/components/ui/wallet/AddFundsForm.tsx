"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Check, InfoIcon, Sparkles, Wallet2 } from "lucide-react";
import { inrToSol, solToInr } from "@/lib/solana/conversions";
import { requestDevnetAirdrop } from "@/lib/wallet-funding";

type AddFundsFormProps = {
  dynamicUserId: string;
  walletAddress: string;
  currentBalance: number | null;
  onFundingComplete?: (signature: string) => void;
};

type FundingState = "idle" | "processing" | "success";

type CheckmarkProps = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
};

const MAX_AIRDROP_SOL = 2;
const MAX_AIRDROP_INR = solToInr(MAX_AIRDROP_SOL);
const PRESET_AMOUNTS_INR = [500, 1000, 2500, 5000];

const drawVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delayIndex: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        delay: delayIndex * 0.2,
        type: "spring",
        duration: 1.2,
        bounce: 0.2,
      },
      opacity: { delay: delayIndex * 0.2, duration: 0.3 },
    },
  }),
};

function Checkmark({
  size = 90,
  strokeWidth = 2,
  color = "currentColor",
  className = "",
}: CheckmarkProps) {
  return (
    <motion.svg
      animate="visible"
      className={className}
      height={size}
      initial="hidden"
      viewBox="0 0 100 100"
      width={size}
    >
      <motion.circle
        custom={0}
        cx="50"
        cy="50"
        r="42"
        stroke={color}
        style={{
          strokeWidth,
          strokeLinecap: "round",
          fill: "transparent",
          filter: "drop-shadow(0 0 2px rgba(16, 185, 129, 0.2))",
        }}
        variants={drawVariants}
      />
      <motion.path
        custom={1}
        d="M32 50L45 63L68 35"
        stroke={color}
        style={{
          strokeWidth: strokeWidth + 0.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          fill: "transparent",
          filter: "drop-shadow(0 0 1px rgba(16, 185, 129, 0.3))",
        }}
        variants={drawVariants}
      />
    </motion.svg>
  );
}

export function AddFundsForm({
  dynamicUserId,
  walletAddress,
  currentBalance,
  onFundingComplete,
}: AddFundsFormProps) {
  const [amountInrInput, setAmountInrInput] = useState("1000");
  const [fundingState, setFundingState] = useState<FundingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successSignature, setSuccessSignature] = useState<string | null>(null);
  const [processingLabel, setProcessingLabel] = useState("Preparing devnet airdrop...");

  const amountInr = Number.parseFloat(amountInrInput);
  const amountSol = inrToSol(amountInr);
  const currentBalanceInInr = currentBalance !== null ? solToInr(currentBalance) : null;

  const amountValidationError = useMemo(() => {
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      return "Enter a valid INR amount.";
    }
    if (amountInr > MAX_AIRDROP_INR) {
      return `Maximum per request is INR ${MAX_AIRDROP_INR.toFixed(2)} (${MAX_AIRDROP_SOL} SOL).`;
    }
    return null;
  }, [amountInr]);

  const canAddFunds =
    Boolean(walletAddress) &&
    Boolean(dynamicUserId) &&
    !amountValidationError &&
    fundingState !== "processing";

  const handleAddFunds = useCallback(async () => {
    if (!canAddFunds) return;

    setFundingState("processing");
    setError(null);
    setSuccessSignature(null);

    const steps = [
      "Preparing devnet airdrop...",
      "Requesting SOL from faucet...",
      "Finalizing on Solana devnet...",
    ];

    let stepIndex = 0;
    setProcessingLabel(steps[stepIndex]);

    const stepTicker = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setProcessingLabel(steps[stepIndex]);
    }, 650);

    try {
      const [result] = await Promise.all([
        requestDevnetAirdrop({
          dynamicUserId,
          walletAddress,
          amountInr,
        }),
        new Promise((resolve) => setTimeout(resolve, 1300)),
      ]);

      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to add funds.");
      }

      clearInterval(stepTicker);
      setSuccessSignature(result.data.signature);
      setFundingState("success");
      onFundingComplete?.(result.data.signature);
    } catch (err) {
      clearInterval(stepTicker);
      setFundingState("idle");
      setError(err instanceof Error ? err.message : "Failed to add funds.");
    }
  }, [amountInr, canAddFunds, dynamicUserId, walletAddress, onFundingComplete]);

  return (
    <motion.div
      className="liquid-glass-strong rounded-[1.75rem] p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Add Funds</h2>
        <Wallet2 className="h-5 w-5 text-emerald-300" />
      </div>

      <p className="mt-2 text-xs text-white/60">
        INR UI, devnet SOL in background for embedded wallet purchases.
      </p>

      {fundingState === "success" ? (
        <div className="mt-4 liquid-glass rounded-xl p-4">
          <div className="flex flex-col items-center justify-center text-center">
            <Checkmark className="text-emerald-300" size={84} />
            <p className="mt-2 text-sm font-medium text-emerald-200">
              Added INR {amountInr.toFixed(2)} (~{amountSol.toFixed(4)} SOL)
            </p>
            {successSignature && (
              <a
                href={`https://solscan.io/tx/${successSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs text-white/60 hover:text-white/80"
              >
                View transaction on Solscan
              </a>
            )}
            <button
              onClick={() => setFundingState("idle")}
              className="mt-3 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
            >
              Add more
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="liquid-glass rounded-xl p-4">
            <label className="block text-xs uppercase tracking-[0.16em] text-white/50">
              Amount (INR)
            </label>
            <input
              type="number"
              value={amountInrInput}
              onChange={(event) => setAmountInrInput(event.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-emerald-300/50 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_AMOUNTS_INR.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmountInrInput(String(preset))}
                  className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
                >
                  INR {preset}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">
              You receive ~{Number.isFinite(amountSol) ? amountSol.toFixed(6) : "0.000000"} SOL.
            </p>
            {currentBalanceInInr !== null && (
              <p className="text-xs text-white/45">
                Current balance: INR {currentBalanceInInr.toFixed(2)} (~{currentBalance?.toFixed(4)} SOL)
              </p>
            )}
            {amountValidationError && <p className="mt-1 text-xs text-red-400">{amountValidationError}</p>}
          </div>

          <div className="liquid-glass rounded-xl p-4">
            {fundingState === "processing" ? (
              <div>
                <div className="flex items-center gap-2 text-sm text-emerald-200">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  {processingLabel}
                </div>
                <div className="mt-3 overflow-hidden rounded-full bg-black/30">
                  <motion.div
                    className="h-1.5 rounded-full bg-emerald-300/80"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.3, ease: "easeInOut" }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/55">
                  Airdropping devnet SOL to your embedded wallet.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white/55">
                <InfoIcon className="h-3.5 w-3.5 text-white/45" />
                Max per request: INR {MAX_AIRDROP_INR.toFixed(2)} ({MAX_AIRDROP_SOL} SOL)
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleAddFunds}
            disabled={!canAddFunds}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-300/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fundingState === "processing" ? (
              <>
                <motion.span
                  className="inline-flex"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
                Adding Funds...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Add Funds
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
