export const formatSol = (lamports: number, fractionDigits = 2) =>
  `${(lamports / 1_000_000_000).toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
  })} SOL`;