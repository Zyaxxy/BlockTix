import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { USERS_TABLE } from "@/lib/profile";

const SOL_TRANSFERS_TABLE = "sol_transfers";

type RecordTransferRequest = {
  dynamicUserId: string;
  senderWallet: string;
  receiverWallet: string;
  amountLamports: number;
  signature?: string;
};

export async function POST(request: Request) {
  const log = createDevRequestLogger("api/wallet/transfer:POST");
  log.info("request received");

  const body = (await request.json().catch(() => null)) as RecordTransferRequest | null;

  if (!body) {
    log.warn("invalid request body");
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  log.info("request body parsed", {
    dynamicUserId: body.dynamicUserId,
    senderWallet: body.senderWallet,
    receiverWallet: body.receiverWallet,
    amountLamports: body.amountLamports,
    hasSignature: Boolean(body.signature),
  });

  if (!body.dynamicUserId || !body.senderWallet || !body.receiverWallet) {
    log.warn("missing required transfer fields", {
      hasDynamicUserId: Boolean(body.dynamicUserId),
      hasSenderWallet: Boolean(body.senderWallet),
      hasReceiverWallet: Boolean(body.receiverWallet),
    });
    return NextResponse.json({ error: "Missing required transfer fields." }, { status: 400 });
  }

  if (!Number.isFinite(body.amountLamports) || body.amountLamports <= 0) {
    log.warn("invalid amount lamports", {
      amountLamports: body.amountLamports,
    });
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  log.info("verifying dynamic token", {
    dynamicUserId: body.dynamicUserId,
  });
  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    log.warn("dynamic token verification failed", {
      dynamicUserId: body.dynamicUserId,
      error: authResult.error,
    });
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  log.info("dynamic token verified", {
    dynamicUserId: authResult.dynamicUserId,
  });

  log.info("loading user record", {
    dynamicUserId: authResult.dynamicUserId,
  });
  const { data: userRow, error: userError } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("uid")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    log.error("failed to load user record", {
      error: userError.message,
    });
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow) {
    log.warn("unknown dynamic user", {
      dynamicUserId: authResult.dynamicUserId,
    });
    return NextResponse.json({ error: "Unknown Dynamic user." }, { status: 403 });
  }

  log.info("inserting transfer record", {
    senderWallet: body.senderWallet,
    receiverWallet: body.receiverWallet,
    amountLamports: Math.floor(body.amountLamports),
  });

  const { error: transferError } = await supabaseAdmin.from(SOL_TRANSFERS_TABLE).insert({
    sender_wallet: body.senderWallet,
    receiver_wallet: body.receiverWallet,
    amount_lamports: Math.floor(body.amountLamports),
    signature: body.signature ?? null,
    status: "confirmed",
  });

  if (transferError) {
    if (transferError.message.includes("relation") && transferError.message.includes("does not exist")) {
      log.warn("transfers table not found - migration may not have run");
      return NextResponse.json({ data: { ok: true, warning: "Transfer recorded on-chain but database table not found." } });
    }
    log.error("failed to insert transfer record", {
      error: transferError.message,
    });
    return NextResponse.json({ error: transferError.message }, { status: 500 });
  }

  log.info("transfer recorded successfully", {
    senderWallet: body.senderWallet,
    receiverWallet: body.receiverWallet,
  });

  return NextResponse.json({ data: { ok: true } });
}