import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { AUCTIONS_TABLE, AUCTION_ACTIVITY_TABLE } from "@/lib/auctions/normalize-auction";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

type RecordBidRequest = {
  dynamicUserId: string;
  bidderWallet: string;
  amount: number;
  signature?: string;
  highestBidAmount?: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ auctionId: string }> }
) {
  const log = createDevRequestLogger("api/auctions/[auctionId]/bid:POST");
  const { auctionId } = await context.params;
  log.info("request received", { auctionId });

  const body = (await request.json().catch(() => null)) as RecordBidRequest | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.dynamicUserId || !isNonEmptyString(body.bidderWallet)) {
    return NextResponse.json(
      { error: "Missing dynamicUserId or bidderWallet." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(body.amount) || body.amount <= 0) {
    return NextResponse.json(
      { error: "Bid amount must be a positive number." },
      { status: 400 }
    );
  }

  if (
    body.highestBidAmount !== undefined &&
    (!Number.isFinite(body.highestBidAmount) || body.highestBidAmount < 0)
  ) {
    return NextResponse.json(
      { error: "highestBidAmount must be a non-negative number." },
      { status: 400 }
    );
  }

  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  const { data: auctionRow, error: auctionError } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .select("id, status, highest_bid_amount")
    .eq("id", auctionId)
    .maybeSingle();

  if (auctionError) {
    log.error("failed to load auction", { auctionId, error: auctionError.message });
    return NextResponse.json({ error: auctionError.message }, { status: 500 });
  }

  if (!auctionRow) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (auctionRow.status !== "active") {
    return NextResponse.json(
      { error: "Bids can only be recorded for active auctions." },
      { status: 409 }
    );
  }

  const sanitizedSignature = body.signature?.trim() || null;

  const { error: activityError } = await supabaseAdmin.from(AUCTION_ACTIVITY_TABLE).insert({
    auction_id: auctionId,
    action_type: "bid",
    actor_uid: authResult.dynamicUserId,
    actor_wallet: body.bidderWallet.trim(),
    amount: Math.floor(body.amount),
    signature: sanitizedSignature,
    metadata: body.highestBidAmount !== undefined ? { highestBidAmount: Math.floor(body.highestBidAmount) } : {},
  });

  if (activityError) {
    log.error("failed to insert bid activity", {
      auctionId,
      error: activityError.message,
    });
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  if (
    body.highestBidAmount !== undefined &&
    Math.floor(body.highestBidAmount) > Number(auctionRow.highest_bid_amount ?? 0)
  ) {
    const { error: updateError } = await supabaseAdmin
      .from(AUCTIONS_TABLE)
      .update({
        highest_bidder: body.bidderWallet.trim(),
        highest_bid_amount: Math.floor(body.highestBidAmount),
      })
      .eq("id", auctionId);

    if (updateError) {
      log.warn("failed to update highest bid snapshot", {
        auctionId,
        error: updateError.message,
      });
    }
  }

  return NextResponse.json({ data: { ok: true } });
}
