/**
 * Flat rate: 1 SOL = 100 USD
 */
export const SOL_USD_RATE = 100;

/**
 * Converts SOL to USD based on the flat rate.
 */
export const solToUsd = (sol: number | bigint): number => {
    const solNum = typeof sol === "bigint" ? Number(sol) : sol;
    return solNum * SOL_USD_RATE;
};

/**
 * Converts USD to SOL based on the flat rate.
 */
export const usdToSol = (usd: number | string): number => {
    const usdNum = typeof usd === "string" ? parseFloat(usd) : usd;
    if (isNaN(usdNum)) return 0;
    return usdNum / SOL_USD_RATE;
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
 * Converts USD to Lamports for on-chain usage.
 * Input: USD amount
 * Output: Lamports (BigInt)
 */
export const usdToLamports = (usd: number | string): bigint => {
    const sol = usdToSol(usd);
    return solToLamports(sol);
};

/**
 * Converts Lamports to USD for display purposes.
 * Input: Lamports
 * Output: USD amount
 */
export const lamportsToUsd = (lamports: number | bigint): number => {
    const sol = lamportsToSol(lamports);
    return solToUsd(sol);
};
