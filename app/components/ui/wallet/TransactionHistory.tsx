"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react";
import { buildWalletHistory, type WalletHistoryItem } from "@/lib/wallet-history";
import { formatSol } from "@/lib/shared/format";
import { useEffect, useState } from "react";

type TransactionHistoryProps = {
  walletAddress: string;
};

const SOLSCAN_URL = "https://solscan.io";

const formatAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
};

const getActionLabel = (item: WalletHistoryItem) => {
  switch (item.action) {
    case "send":
      return "Sent SOL";
    case "receive":
      return "Received SOL";
    case "mint":
      return "Minted Ticket";
    case "bid":
      return "Placed Bid";
    case "win":
      return "Won Auction";
    case "refund":
      return "Refund";
    case "cancel":
      return "Cancelled";
    default:
      return "Transaction";
  }
};

export function TransactionHistory({ walletAddress }: TransactionHistoryProps) {
  const [history, setHistory] = useState<WalletHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await buildWalletHistory(walletAddress);
        setHistory(data);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      loadHistory();
    }
  }, [walletAddress]);

  return (
    <motion.div
      className="liquid-glass-strong rounded-[1.75rem] p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Transaction History</h2>
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="liquid-glass rounded-xl p-4 text-sm text-white/70">
            Loading transaction history...
          </div>
        )}

        {!loading && history.length === 0 && (
          <div className="liquid-glass rounded-xl p-4 text-sm text-white/70">
            No transactions yet. Your transfer history will appear here.
          </div>
        )}

        {!loading &&
          history.map((item) => (
            <div
              key={item.id}
              className="liquid-glass rounded-xl p-4 flex items-center gap-4"
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  item.action === "send"
                    ? "bg-red-400/20 text-red-300"
                    : item.action === "receive"
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "bg-amber-400/20 text-amber-300"
                }`}
              >
                {item.action === "send" ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : item.action === "receive" ? (
                  <ArrowDownLeft className="h-5 w-5" />
                ) : (
                  <ExternalLink className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90">
                  {getActionLabel(item)}
                </p>
                {item.counterparty && (
                  <p className="text-xs text-white/50">
                    {item.action === "send" ? "To" : "From"}: {formatAddress(item.counterparty)}
                  </p>
                )}
                {item.details.eventName && (
                  <p className="text-xs text-white/50">{item.details.eventName}</p>
                )}
                <p className="text-xs text-white/40 mt-1">{formatTimeAgo(item.createdAt)}</p>
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-medium ${
                    item.action === "send" ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {item.action === "send" ? "-" : "+"}
                  {formatSol(item.amount)}
                </p>
                {item.details.signature && (
                  <a
                    href={`${SOLSCAN_URL}/tx/${item.details.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/40 hover:text-white/60"
                  >
                    View on Solscan
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>
    </motion.div>
  );
}