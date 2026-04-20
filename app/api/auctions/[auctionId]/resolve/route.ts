import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { AUCTIONS_TABLE, AUCTION_ACTIVITY_TABLE } from "@/lib/auctions/normalize-auction";
import { USERS_TABLE } from "@/lib/profile";

type ResolveAuctionRequest = {
  dynamicUserId: string;
  resolveSignature: string;
  winnerWallet?: string;
  highestBidAmount?: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ auctionId: string }> }
) {
  const log = createDevRequestLogger("api/auctions/[auctionId]/resolve:POST");
  const { auctionId } = await context.params;
  log.info("request received", { auctionId });

  const body = (await request.json().catch(() => null)) as ResolveAuctionRequest | null;

  if (!body || !body.dynamicUserId || !body.resolveSignature?.trim()) {
    return NextResponse.json(
      { error: "Missing dynamicUserId or resolveSignature." },
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

  const { data: userRow, error: userError } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("uid, role")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    log.error("failed to load user role", { error: userError.message });
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow || userRow.role !== "organizer") {
    return NextResponse.json(
      { error: "Only organizers can resolve auctions." },
      { status: 403 }
    );
  }

  const { data: auctionRow, error: auctionError } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .select("id, organizer_uid, status")
    .eq("id", auctionId)
    .maybeSingle();

  if (auctionError) {
    log.error("failed to load auction", { auctionId, error: auctionError.message });
    return NextResponse.json({ error: auctionError.message }, { status: 500 });
  }

  if (!auctionRow) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (auctionRow.organizer_uid !== authResult.dynamicUserId) {
    return NextResponse.json(
      { error: "Not authorized to resolve this auction." },
      { status: 403 }
    );
  }

  if (auctionRow.status === "cancelled") {
    return NextResponse.json(
      { error: "Cancelled auctions cannot be resolved." },
      { status: 409 }
    );
  }

  const highestBidAmount =
    body.highestBidAmount !== undefined ? Math.floor(body.highestBidAmount) : null;

  const { error: updateError } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .update({
      status: "resolved",
      resolved: true,
      resolve_signature: body.resolveSignature.trim(),
      resolved_at: new Date().toISOString(),
      highest_bidder: body.winnerWallet?.trim() || null,
      ...(highestBidAmount !== null ? { highest_bid_amount: highestBidAmount } : {}),
    })
    .eq("id", auctionId);

  if (updateError) {
    log.error("failed to update auction", { auctionId, error: updateError.message });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: activityError } = await supabaseAdmin.from(AUCTION_ACTIVITY_TABLE).insert({
    auction_id: auctionId,
    action_type: "resolve",
    actor_uid: authResult.dynamicUserId,
    actor_wallet: body.winnerWallet?.trim() || null,
    amount: highestBidAmount,
    signature: body.resolveSignature.trim(),
  });

  if (activityError) {
    log.warn("failed to insert resolve activity", {
      auctionId,
      error: activityError.message,
    });
  }

  return NextResponse.json({ data: { ok: true } });
}
