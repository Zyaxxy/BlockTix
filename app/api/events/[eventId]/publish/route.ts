import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { EVENTS_TABLE } from "@/lib/events";
import { USERS_TABLE } from "@/lib/profile";

type PublishEventRequest = {
  dynamicUserId: string;
  candyMachineId: string;
  metadataUri?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const log = createDevRequestLogger("api/events/[eventId]/publish:PATCH");
  const { eventId } = await context.params;
  log.info("request received", { eventId });

  const body = (await request.json().catch(() => null)) as PublishEventRequest | null;

  if (!body || !body.dynamicUserId || !body.candyMachineId) {
    log.warn("missing required publish fields", {
      eventId,
      hasBody: Boolean(body),
      hasDynamicUserId: Boolean(body?.dynamicUserId),
      hasCandyMachineId: Boolean(body?.candyMachineId),
    });
    return NextResponse.json({ error: "Missing required publish fields." }, { status: 400 });
  }

  log.info("verifying dynamic token", {
    eventId,
    dynamicUserId: body.dynamicUserId,
  });
  const authResult = await verifyDynamicToken(request, body.dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    log.warn("dynamic token verification failed", {
      eventId,
      dynamicUserId: body.dynamicUserId,
      error: authResult.error,
    });
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  log.info("dynamic token verified", {
    eventId,
    dynamicUserId: authResult.dynamicUserId,
  });

  log.info("loading user role", { eventId });
  const { data: userRow, error: userError } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("uid, role")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    log.error("failed to load user role", {
      eventId,
      error: userError.message,
    });
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow || userRow.role !== "organizer") {
    log.warn("user is not organizer", {
      eventId,
      userExists: Boolean(userRow),
      role: userRow?.role ?? null,
    });
    return NextResponse.json({ error: "Only organizers can publish events." }, { status: 403 });
  }

  log.info("loading event for ownership check", { eventId });
  const { data: eventRow, error: eventFetchError } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select("id, organizer_uid")
    .eq("id", eventId)
    .maybeSingle();

  if (eventFetchError) {
    log.error("failed to fetch event", {
      eventId,
      error: eventFetchError.message,
    });
    return NextResponse.json({ error: eventFetchError.message }, { status: 500 });
  }

  if (!eventRow) {
    log.warn("event not found", { eventId });
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (eventRow.organizer_uid !== authResult.dynamicUserId) {
    log.warn("event ownership mismatch", {
      eventId,
      ownerUid: eventRow.organizer_uid,
      callerUid: authResult.dynamicUserId,
    });
    return NextResponse.json({ error: "Not authorized to update this event." }, { status: 403 });
  }

  log.info("updating event to live", {
    eventId,
    candyMachineId: body.candyMachineId,
    hasMetadataUri: Boolean(body.metadataUri),
  });
  const { error: updateError } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .update({
      candy_machine_id: body.candyMachineId,
      metadata_uri: body.metadataUri ?? null,
      status: "live",
    })
    .eq("id", eventId);

  if (updateError) {
    log.error("failed to update event", {
      eventId,
      error: updateError.message,
    });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  log.info("event published", { eventId });

  return NextResponse.json({ data: { ok: true } });
}
