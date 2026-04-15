import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { EVENT_SELECT, EVENTS_TABLE, normalizeEvent } from "@/lib/events";
import { USERS_TABLE } from "@/lib/profile";

type CreateEventRequest = {
  dynamicUserId: string;
  organizerUid: string;
  name: string;
  totalSupply: number;
  priceLamports: number;
  venue?: string;
  description?: string;
  eventDate?: string;
  endDate?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
};

export async function POST(request: Request) {
  const log = createDevRequestLogger("api/events:POST");
  log.info("request received");

  const body = (await request.json().catch(() => null)) as CreateEventRequest | null;

  if (!body) {
    log.warn("invalid request body");
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  log.info("request body parsed", {
    dynamicUserId: body.dynamicUserId,
    organizerUid: body.organizerUid,
    name: body.name,
    totalSupply: body.totalSupply,
    priceLamports: body.priceLamports,
  });

  if (!body.dynamicUserId || !body.organizerUid || !body.name?.trim()) {
    log.warn("missing required fields", {
      hasDynamicUserId: Boolean(body.dynamicUserId),
      hasOrganizerUid: Boolean(body.organizerUid),
      hasName: Boolean(body.name?.trim()),
    });
    return NextResponse.json({ error: "Missing required event fields." }, { status: 400 });
  }

  if (body.dynamicUserId !== body.organizerUid) {
    log.warn("organizer identity mismatch", {
      dynamicUserId: body.dynamicUserId,
      organizerUid: body.organizerUid,
    });
    return NextResponse.json({ error: "Organizer identity mismatch." }, { status: 403 });
  }

  if (!Number.isFinite(body.totalSupply) || body.totalSupply <= 0) {
    log.warn("invalid total supply", { totalSupply: body.totalSupply });
    return NextResponse.json({ error: "Total supply must be greater than zero." }, { status: 400 });
  }

  if (!Number.isFinite(body.priceLamports) || body.priceLamports < 0) {
    log.warn("invalid price lamports", { priceLamports: body.priceLamports });
    return NextResponse.json({ error: "Price lamports must be a non-negative number." }, { status: 400 });
  }

  log.info("verifying dynamic token");
  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    log.warn("dynamic token verification failed", {
      error: authResult.error,
      dynamicUserId: body.dynamicUserId,
    });
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  log.info("dynamic token verified", { dynamicUserId: authResult.dynamicUserId });

  log.info("loading user role");
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
      dynamicUserId: authResult.dynamicUserId,
    });
    return NextResponse.json({ error: "Only organizers can create events." }, { status: 403 });
  }

  const payload = {
    organizer_uid: body.organizerUid,
    name: body.name.trim(),
    total_supply: Math.floor(body.totalSupply),
    price_lamports: Math.floor(body.priceLamports),
    venue: body.venue?.trim() || null,
    description: body.description?.trim() || null,
    event_date: body.eventDate ?? null,
    end_date: body.endDate ?? null,
    image_url: body.imageUrl?.trim() || null,
    category: body.category?.trim() || null,
    tags: body.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    status: "draft" as const,
  };

  log.info("inserting draft event", {
    organizerUid: payload.organizer_uid,
    name: payload.name,
    totalSupply: payload.total_supply,
    priceLamports: payload.price_lamports,
  });
  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .insert(payload)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    log.error("failed to insert draft event", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.info("draft event created", {
    eventId: data.id,
    status: data.status,
  });

  return NextResponse.json({ data: normalizeEvent(data) });
}
