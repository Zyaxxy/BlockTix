import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

const EVENT_SELECT =
  "id, candy_machine_id, organizer_uid, name, venue, description, event_date, end_date, image_url, metadata_uri, category, tags, status, total_supply, price_lamports, minted_count, created_at, updated_at";

const normalizeEvent = (row: {
  id: string;
  candy_machine_id: string | null;
  organizer_uid: string;
  name: string;
  venue: string | null;
  description: string | null;
  event_date: string | null;
  end_date: string | null;
  image_url: string | null;
  metadata_uri: string | null;
  category: string | null;
  tags: string[] | null;
  status: "draft" | "live" | "pre_sale" | "sold_out" | "ended" | "cancelled";
  total_supply: number;
  price_lamports: number;
  minted_count: number;
  created_at: string;
  updated_at: string;
}) => ({
  id: row.id,
  candyMachineId: row.candy_machine_id,
  organizerUid: row.organizer_uid,
  name: row.name,
  venue: row.venue,
  description: row.description,
  eventDate: row.event_date,
  endDate: row.end_date,
  imageUrl: row.image_url,
  metadataUri: row.metadata_uri,
  category: row.category,
  tags: row.tags ?? [],
  status: row.status,
  totalSupply: row.total_supply,
  priceLamports: row.price_lamports,
  mintedCount: row.minted_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateEventRequest | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.dynamicUserId || !body.organizerUid || !body.name?.trim()) {
    return NextResponse.json({ error: "Missing required event fields." }, { status: 400 });
  }

  if (body.dynamicUserId !== body.organizerUid) {
    return NextResponse.json({ error: "Organizer identity mismatch." }, { status: 403 });
  }

  if (!Number.isFinite(body.totalSupply) || body.totalSupply <= 0) {
    return NextResponse.json({ error: "Total supply must be greater than zero." }, { status: 400 });
  }

  if (!Number.isFinite(body.priceLamports) || body.priceLamports < 0) {
    return NextResponse.json({ error: "Price lamports must be a non-negative number." }, { status: 400 });
  }

  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("uid, role")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow || userRow.role !== "organizer") {
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

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert(payload)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: normalizeEvent(data) });
}
