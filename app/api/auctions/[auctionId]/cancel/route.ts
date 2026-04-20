import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { AUCTIONS_TABLE, AUCTION_ACTIVITY_TABLE } from "@/lib/auctions/normalize-auction";
import { USERS_TABLE } from "@/lib/profile";

type CancelAuctionRequest = {
  dynamicUserId: string;
  cancelSignature: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ auctionId: string }> }
) {
  const log = createDevRequestLogger("api/auctions/[auctionId]/cancel:POST");
  const { auctionId } = await context.params;
  log.info("request received", { auctionId });

  const body = (await request.json().catch(() => null)) as CancelAuctionRequest | null;

  if (!body || !body.dynamicUserId || !body.cancelSignature?.trim()) {
    return NextResponse.json(
      { error: "Missing dynamicUserId or cancelSignature." },
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
      { error: "Only organizers can cancel auctions." },
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
      { error: "Not authorized to cancel this auction." },
      { status: 403 }
    );
  }

  if (auctionRow.status === "resolved") {
    return NextResponse.json(
      { error: "Resolved auctions cannot be cancelled." },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .update({
      status: "cancelled",
      resolved: false,
      cancel_signature: body.cancelSignature.trim(),
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", auctionId);

  if (updateError) {
    log.error("failed to update auction", { auctionId, error: updateError.message });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: activityError } = await supabaseAdmin.from(AUCTION_ACTIVITY_TABLE).insert({
    auction_id: auctionId,
    action_type: "cancel",
    actor_uid: authResult.dynamicUserId,
    signature: body.cancelSignature.trim(),
  });

  if (activityError) {
    log.warn("failed to insert cancel activity", {
      auctionId,
      error: activityError.message,
    });
  }

  return NextResponse.json({ data: { ok: true } });
}
