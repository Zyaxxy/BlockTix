export const formatSol = (lamports: number, fractionDigits = 2) => {
  const sol = lamports / 1_000_000_000;
  const usd = sol * 100;
  return `INR ${usd.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};