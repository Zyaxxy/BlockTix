import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { AUCTIONS_TABLE, AUCTION_ACTIVITY_TABLE } from "@/lib/auctions/normalize-auction";

type RefundAuctionRequest = {
  dynamicUserId: string;
  bidderWallet: string;
  refundSignature: string;
  amount?: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ auctionId: string }> }
) {
  const log = createDevRequestLogger("api/auctions/[auctionId]/refund:POST");
  const { auctionId } = await context.params;
  log.info("request received", { auctionId });

  const body = (await request.json().catch(() => null)) as RefundAuctionRequest | null;

  if (!body || !body.dynamicUserId || !body.bidderWallet?.trim() || !body.refundSignature?.trim()) {
    return NextResponse.json(
      { error: "Missing dynamicUserId, bidderWallet, or refundSignature." },
      { status: 400 }
    );
  }

  if (body.amount !== undefined && (!Number.isFinite(body.amount) || body.amount < 0)) {
    return NextResponse.json(
      { error: "Refund amount must be a non-negative number." },
      { status: 400 }
    );
  }

  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  const { data: auctionRow, error: auctionError } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .select("id, status")
    .eq("id", auctionId)
    .maybeSingle();

  if (auctionError) {
    log.error("failed to load auction", { auctionId, error: auctionError.message });
    return NextResponse.json({ error: auctionError.message }, { status: 500 });
  }

  if (!auctionRow) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (auctionRow.status === "active") {
    return NextResponse.json(
      { error: "Refunds are only available after an auction ends." },
      { status: 409 }
    );
  }

  const amount = body.amount !== undefined ? Math.floor(body.amount) : null;

  const { error: activityError } = await supabaseAdmin.from(AUCTION_ACTIVITY_TABLE).insert({
    auction_id: auctionId,
    action_type: "refund",
    actor_uid: authResult.dynamicUserId,
    actor_wallet: body.bidderWallet.trim(),
    amount,
    signature: body.refundSignature.trim(),
  });

  if (activityError) {
    log.error("failed to insert refund activity", {
      auctionId,
      error: activityError.message,
    });
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}
