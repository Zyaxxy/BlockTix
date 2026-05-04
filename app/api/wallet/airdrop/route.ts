import { NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { USERS_TABLE } from "@/lib/profile";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { getRpcEndpoint } from "@/lib/solana/candy-machine";
import { inrToSol, solToInr } from "@/lib/solana/conversions";

const SOL_TRANSFERS_TABLE = "sol_transfers";
const MAX_AIRDROP_SOL = 2;
const AIRDROP_SENDER_LABEL = "devnet-airdrop";

type AirdropRequest = {
  dynamicUserId: string;
  walletAddress: string;
  amountInr: number;
};

export async function POST(request: Request) {
  const log = createDevRequestLogger("api/wallet/airdrop:POST");
  log.info("request received");

  const body = (await request.json().catch(() => null)) as AirdropRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.dynamicUserId || !body.walletAddress) {
    return NextResponse.json(
      { error: "Missing required airdrop fields." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(body.amountInr) || body.amountInr <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive INR value." },
      { status: 400 }
    );
  }

  let walletPublicKey: PublicKey;
  try {
    walletPublicKey = new PublicKey(body.walletAddress);
  } catch {
    return NextResponse.json(
      { error: "Invalid Solana wallet address." },
      { status: 400 }
    );
  }

  const amountSol = inrToSol(body.amountInr);
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    return NextResponse.json(
      { error: "Converted SOL amount is invalid." },
      { status: 400 }
    );
  }

  if (amountSol > MAX_AIRDROP_SOL) {
    return NextResponse.json(
      {
        error: `Devnet faucet max is INR ${solToInr(MAX_AIRDROP_SOL).toFixed(
          2
        )} (${MAX_AIRDROP_SOL} SOL) per request.`,
      },
      { status: 400 }
    );
  }

  const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  if (amountLamports <= 0) {
    return NextResponse.json(
      { error: "Amount is too small after conversion to lamports." },
      { status: 400 }
    );
  }

  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    return NextResponse.json(
      { error: authResult.error ?? "Unauthorized." },
      { status: 401 }
    );
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("uid")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow) {
    return NextResponse.json({ error: "Unknown Dynamic user." }, { status: 403 });
  }

  const rpcEndpoint = getRpcEndpoint();
  if (rpcEndpoint.toLowerCase().includes("mainnet")) {
    return NextResponse.json(
      { error: "Airdrops are only supported on devnet/localnet endpoints." },
      { status: 400 }
    );
  }

  try {
    const connection = new Connection(rpcEndpoint, "confirmed");
    const signature = await connection.requestAirdrop(
      walletPublicKey,
      amountLamports
    );
    await connection.confirmTransaction(signature, "confirmed");

    const { error: transferError } = await supabaseAdmin.from(SOL_TRANSFERS_TABLE).insert({
      sender_wallet: AIRDROP_SENDER_LABEL,
      receiver_wallet: body.walletAddress,
      amount_lamports: amountLamports,
      signature,
      status: "confirmed",
    });

    if (transferError) {
      if (
        transferError.message.includes("relation") &&
        transferError.message.includes("does not exist")
      ) {
        log.warn("transfers table not found while recording airdrop");
      } else {
        return NextResponse.json({ error: transferError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      data: {
        signature,
        amountLamports,
        amountSol: amountLamports / LAMPORTS_PER_SOL,
        amountInr: body.amountInr,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to request devnet airdrop.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
