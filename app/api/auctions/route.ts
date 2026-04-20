import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import {
  AUCTIONS_TABLE,
  AUCTION_ACTIVITY_TABLE,
  AUCTION_SELECT,
  normalizeAuction,
  type AuctionStatus,
} from "@/lib/auctions/normalize-auction";
import { EVENTS_TABLE } from "@/lib/events";
import { USERS_TABLE } from "@/lib/profile";

type CreateAuctionRequest = {
  dynamicUserId: string;
  organizerUid: string;
  makerWallet: string;
  auctionAddress: string;
  seed: number;
  nftMint: string;
  bidMint: string;
  endTime: string;
  eventId?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  createSignature?: string;
};

const normalizeStatus = (value: string | null): AuctionStatus | null => {
  if (value === "active" || value === "resolved" || value === "cancelled") {
    return value;
  }
  return null;
};

const toIsoStringOrNull = (value: string): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export async function GET(request: Request) {
  const log = createDevRequestLogger("api/auctions:GET");
  const url = new URL(request.url);

  const organizerUid = url.searchParams.get("organizerUid")?.trim() ?? null;
  const eventId = url.searchParams.get("eventId")?.trim() ?? null;
  const status = normalizeStatus(url.searchParams.get("status"));

  log.info("request received", {
    organizerUid,
    eventId,
    status,
  });

  let query = supabaseAdmin.from(AUCTIONS_TABLE).select(AUCTION_SELECT);

  if (organizerUid) {
    query = query.eq("organizer_uid", organizerUid);
  }

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    log.error("failed to load auctions", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const auctions = (data ?? []).map(normalizeAuction);
  log.info("auctions loaded", { count: auctions.length });

  return NextResponse.json({ data: auctions });
}

export async function POST(request: Request) {
  const log = createDevRequestLogger("api/auctions:POST");
  log.info("request received");

  const body = (await request.json().catch(() => null)) as CreateAuctionRequest | null;

  if (!body) {
    log.warn("invalid request body");
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body.dynamicUserId ||
    !body.organizerUid ||
    !body.makerWallet?.trim() ||
    !body.auctionAddress?.trim() ||
    !body.nftMint?.trim() ||
    !body.bidMint?.trim() ||
    !body.endTime
  ) {
    log.warn("missing required create fields", {
      hasDynamicUserId: Boolean(body.dynamicUserId),
      hasOrganizerUid: Boolean(body.organizerUid),
      hasMakerWallet: Boolean(body.makerWallet?.trim()),
      hasAuctionAddress: Boolean(body.auctionAddress?.trim()),
      hasNftMint: Boolean(body.nftMint?.trim()),
      hasBidMint: Boolean(body.bidMint?.trim()),
      hasEndTime: Boolean(body.endTime),
    });
    return NextResponse.json(
      { error: "Missing required auction fields." },
      { status: 400 }
    );
  }

  if (body.dynamicUserId !== body.organizerUid) {
    log.warn("organizer identity mismatch", {
      dynamicUserId: body.dynamicUserId,
      organizerUid: body.organizerUid,
    });
    return NextResponse.json({ error: "Organizer identity mismatch." }, { status: 403 });
  }

  if (!Number.isInteger(body.seed) || body.seed < 0) {
    log.warn("invalid seed", { seed: body.seed });
    return NextResponse.json(
      { error: "Auction seed must be a non-negative integer." },
      { status: 400 }
    );
  }

  const endTimeIso = toIsoStringOrNull(body.endTime);
  if (!endTimeIso) {
    log.warn("invalid end time", { endTime: body.endTime });
    return NextResponse.json(
      { error: "Auction endTime must be a valid ISO-8601 datetime string." },
      { status: 400 }
    );
  }

  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    log.warn("dynamic token verification failed", {
      dynamicUserId: body.dynamicUserId,
      error: authResult.error,
    });
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
    log.warn("user is not organizer", {
      userExists: Boolean(userRow),
      role: userRow?.role ?? null,
    });
    return NextResponse.json(
      { error: "Only organizers can create auctions." },
      { status: 403 }
    );
  }

  if (body.eventId) {
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from(EVENTS_TABLE)
      .select("id, organizer_uid")
      .eq("id", body.eventId)
      .maybeSingle();

    if (eventError) {
      log.error("failed to load linked event", {
        eventId: body.eventId,
        error: eventError.message,
      });
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    if (!eventRow) {
      log.warn("linked event not found", { eventId: body.eventId });
      return NextResponse.json({ error: "Linked event not found." }, { status: 404 });
    }

    if (eventRow.organizer_uid !== authResult.dynamicUserId) {
      log.warn("event ownership mismatch", {
        ownerUid: eventRow.organizer_uid,
        callerUid: authResult.dynamicUserId,
      });
      return NextResponse.json(
        { error: "Not authorized to link this event." },
        { status: 403 }
      );
    }
  }

  const payload = {
    auction_address: body.auctionAddress.trim(),
    seed: body.seed,
    organizer_uid: authResult.dynamicUserId,
    maker_wallet: body.makerWallet.trim(),
    event_id: body.eventId ?? null,
    title: body.title?.trim() || null,
    description: body.description?.trim() || null,
    image_url: body.imageUrl?.trim() || null,
    nft_mint: body.nftMint.trim(),
    bid_mint: body.bidMint.trim(),
    end_time: endTimeIso,
    status: "active" as const,
    highest_bid_amount: 0,
    resolved: false,
    create_signature: body.createSignature?.trim() || null,
  };

  const { data, error } = await supabaseAdmin
    .from(AUCTIONS_TABLE)
    .insert(payload)
    .select(AUCTION_SELECT)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    log.error("failed to insert auction", { error: error.message, code: error.code });
    return NextResponse.json({ error: error.message }, { status });
  }

  if (payload.create_signature) {
    const { error: activityError } = await supabaseAdmin.from(AUCTION_ACTIVITY_TABLE).insert({
      auction_id: data.id,
      action_type: "create",
      actor_uid: authResult.dynamicUserId,
      signature: payload.create_signature,
    });

    if (activityError) {
      log.warn("failed to insert create activity", {
        auctionId: data.id,
        error: activityError.message,
      });
    }
  }

  log.info("auction created", {
    auctionId: data.id,
    auctionAddress: data.auction_address,
  });

  return NextResponse.json({ data: normalizeAuction(data) });
}
