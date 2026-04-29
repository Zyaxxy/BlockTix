import { solToInr } from "@/lib/solana/conversions";

export const formatSol = (lamports: number, fractionDigits = 2) => {
  const sol = lamports / 1_000_000_000;
  const inr = solToInr(sol);
  return `INR ${inr.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};