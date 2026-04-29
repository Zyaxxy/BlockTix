/**
 * Flat rate: 1 SOL = 10,000 INR
 */
export const SOL_INR_RATE = 10_000;

/**
 * Converts SOL to INR based on the flat rate.
 */
export const solToInr = (sol: number | bigint): number => {
    const solNum = typeof sol === "bigint" ? Number(sol) : sol;
    return solNum * SOL_INR_RATE;
};

/**
 * Converts INR to SOL based on the flat rate.
 */
export const inrToSol = (inr: number | string): number => {
    const inrNum = typeof inr === "string" ? parseFloat(inr) : inr;
    if (isNaN(inrNum)) return 0;
    return inrNum / SOL_INR_RATE;
};

/**
 * Converts SOL to Lamports.
 */
export const solToLamports = (sol: number | bigint): bigint => {
    const solNum = typeof sol === "bigint" ? Number(sol) : sol;
    return BigInt(Math.floor(solNum * 1_000_000_000));
};

/**
 * Converts Lamports to SOL.
 */
export const lamportsToSol = (lamports: number | bigint): number => {
    const lamportsNum = typeof lamports === "bigint" ? Number(lamports) : lamports;
    return lamportsNum / 1_000_000_000;
};

/**
 * Converts INR to Lamports for on-chain usage.
 * Input: INR amount
 * Output: Lamports (BigInt)
 */
export const inrToLamports = (inr: number | string): bigint => {
    const sol = inrToSol(inr);
    return solToLamports(sol);
};

/**
 * Converts Lamports to INR for display purposes.
 * Input: Lamports
 * Output: INR amount
 */
export const lamportsToInr = (lamports: number | bigint): number => {
    const sol = lamportsToSol(lamports);
    return solToInr(sol);
};

// Backward-compatible aliases retained during INR migration.
export const SOL_USD_RATE = SOL_INR_RATE;
export const solToUsd = solToInr;
export const usdToSol = inrToSol;
export const usdToLamports = inrToLamports;
export const lamportsToUsd = lamportsToInr;
