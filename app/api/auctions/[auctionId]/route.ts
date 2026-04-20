import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import {
  AUCTIONS_TABLE,
  AUCTION_ACTIVITY_TABLE,
  AUCTION_SELECT,
  normalizeAuction,
  normalizeAuctionActivity,
} from "@/lib/auctions/normalize-auction";

export async function GET(
  _request: Request,
  context: { params: Promise<{ auctionId: string }> }
) {
  const log = createDevRequestLogger("api/auctions/[auctionId]:GET");
  const { auctionId } = await context.params;

  log.info("request received", { auctionId });

  const { data: auctionRow, error: auctionError } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .select(AUCTION_SELECT)
    .eq("id", auctionId)
    .maybeSingle();

  if (auctionError) {
    log.error("failed to load auction", { auctionId, error: auctionError.message });
    return NextResponse.json({ error: auctionError.message }, { status: 500 });
  }

  if (!auctionRow) {
    log.warn("auction not found", { auctionId });
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  const { data: activityRows, error: activityError } = await supabaseAdmin
    .from(AUCTION_ACTIVITY_TABLE)
    .select("id, auction_id, action_type, actor_uid, actor_wallet, amount, signature, metadata, created_at")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (activityError) {
    log.error("failed to load auction activity", {
      auctionId,
      error: activityError.message,
    });
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      auction: normalizeAuction(auctionRow),
      activity: (activityRows ?? []).map(normalizeAuctionActivity),
    },
  });
}
