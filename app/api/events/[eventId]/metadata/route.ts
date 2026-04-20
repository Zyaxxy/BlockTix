import { NextResponse } from "next/server";
import { EVENTS_TABLE } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FALLBACK_EVENT_IMAGE =
  "https://dummyimage.com/1200x630/0b0f14/ffffff&text=BlockTix";
const FALLBACK_EXTERNAL_URL = "https://blocktix.app";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const requestOrigin = new URL(request.url).origin;

  if (!eventId) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  const { data: eventRow, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select("id, name, venue, description, image_url, category, tags")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load event metadata." }, { status: 500 });
  }

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const imageUrl = eventRow.image_url?.trim() || FALLBACK_EVENT_IMAGE;
  const category = eventRow.category?.trim() || "Ticket";
  const metadata = {
    name: `${eventRow.name} Ticket`,
    symbol: "BTIX",
    description:
      eventRow.description?.trim() || `${eventRow.name} entry ticket minted on BlockTix.`,
    image: imageUrl,
    external_url: requestOrigin || FALLBACK_EXTERNAL_URL,
    attributes: [
      { trait_type: "Event", value: eventRow.name },
      { trait_type: "Venue", value: eventRow.venue?.trim() || "TBA" },
      { trait_type: "Category", value: category },
      ...(eventRow.tags ?? []).map((tag: string) => ({
        trait_type: "Tag",
        value: tag,
      })),
    ],
    properties: {
      files: [{ uri: imageUrl, type: "image/png" }],
      category: "image",
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}