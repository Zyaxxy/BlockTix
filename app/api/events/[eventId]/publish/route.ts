import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PublishEventRequest = {
  dynamicUserId: string;
  candyMachineId: string;
  metadataUri?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as PublishEventRequest | null;

  if (!body || !body.dynamicUserId || !body.candyMachineId) {
    return NextResponse.json({ error: "Missing required publish fields." }, { status: 400 });
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
    return NextResponse.json({ error: "Only organizers can publish events." }, { status: 403 });
  }

  const { data: eventRow, error: eventFetchError } = await supabaseAdmin
    .from("events")
    .select("id, organizer_uid")
    .eq("id", eventId)
    .maybeSingle();

  if (eventFetchError) {
    return NextResponse.json({ error: eventFetchError.message }, { status: 500 });
  }

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (eventRow.organizer_uid !== authResult.dynamicUserId) {
    return NextResponse.json({ error: "Not authorized to update this event." }, { status: 403 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({
      candy_machine_id: body.candyMachineId,
      metadata_uri: body.metadataUri ?? null,
      status: "live",
    })
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}
