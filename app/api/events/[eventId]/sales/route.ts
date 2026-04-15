import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";
import { EVENTS_TABLE, TICKET_SALES_TABLE } from "@/lib/events";
import { USERS_TABLE } from "@/lib/profile";

type RecordSaleRequest = {
  dynamicUserId: string;
  candyMachineId: string;
  buyerWallet: string;
  ticketMint: string;
  priceLamports: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const log = createDevRequestLogger("api/events/[eventId]/sales:POST");
  const { eventId } = await context.params;
  log.info("request received", { eventId });

  const body = (await request.json().catch(() => null)) as RecordSaleRequest | null;

  if (!body) {
    log.warn("invalid request body", { eventId });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  log.info("request body parsed", {
    eventId,
    dynamicUserId: body.dynamicUserId,
    candyMachineId: body.candyMachineId,
    buyerWallet: body.buyerWallet,
    ticketMint: body.ticketMint,
    priceLamports: body.priceLamports,
  });

  if (!body.dynamicUserId || !body.candyMachineId || !body.buyerWallet || !body.ticketMint) {
    log.warn("missing required sale fields", {
      eventId,
      hasDynamicUserId: Boolean(body.dynamicUserId),
      hasCandyMachineId: Boolean(body.candyMachineId),
      hasBuyerWallet: Boolean(body.buyerWallet),
      hasTicketMint: Boolean(body.ticketMint),
    });
    return NextResponse.json({ error: "Missing required sale fields." }, { status: 400 });
  }

  if (!Number.isFinite(body.priceLamports) || body.priceLamports < 0) {
    log.warn("invalid price lamports", {
      eventId,
      priceLamports: body.priceLamports,
    });
    return NextResponse.json({ error: "Price lamports must be a non-negative number." }, { status: 400 });
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

  log.info("loading user record", {
    eventId,
    dynamicUserId: authResult.dynamicUserId,
  });
  const { data: userRow, error: userError } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("uid")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    log.error("failed to load user record", {
      eventId,
      error: userError.message,
    });
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow) {
    log.warn("unknown dynamic user", {
      eventId,
      dynamicUserId: authResult.dynamicUserId,
    });
    return NextResponse.json({ error: "Unknown Dynamic user." }, { status: 403 });
  }

  log.info("loading event", { eventId });
  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select("id, candy_machine_id, minted_count, total_supply")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    log.error("failed to load event", {
      eventId,
      error: eventError.message,
    });
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  if (!eventRow) {
    log.warn("event not found", { eventId });
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (eventRow.candy_machine_id !== body.candyMachineId) {
    log.warn("candy machine mismatch", {
      eventId,
      expected: eventRow.candy_machine_id,
      received: body.candyMachineId,
    });
    return NextResponse.json({ error: "Candy machine does not match event." }, { status: 400 });
  }

  const mintedCount = Number(eventRow.minted_count ?? 0);
  const totalSupply = Number(eventRow.total_supply ?? 0);

  if (totalSupply > 0 && mintedCount >= totalSupply) {
    log.warn("event is sold out", {
      eventId,
      mintedCount,
      totalSupply,
    });
    return NextResponse.json({ error: "Event is sold out." }, { status: 409 });
  }

  log.info("inserting ticket sale", {
    eventId,
    ticketMint: body.ticketMint,
    buyerWallet: body.buyerWallet,
    priceLamports: Math.floor(body.priceLamports),
  });
  const { error: saleError } = await supabaseAdmin.from(TICKET_SALES_TABLE).insert({
    event_id: eventId,
    candy_machine_id: body.candyMachineId,
    buyer_wallet: body.buyerWallet,
    ticket_mint: body.ticketMint,
    price_lamports: Math.floor(body.priceLamports),
  });

  if (saleError) {
    log.error("failed to insert ticket sale", {
      eventId,
      error: saleError.message,
    });
    return NextResponse.json({ error: saleError.message }, { status: 500 });
  }

  log.info("incrementing minted count", {
    eventId,
    previousMintedCount: mintedCount,
    nextMintedCount: mintedCount + 1,
  });
  const { error: updateError } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .update({ minted_count: mintedCount + 1 })
    .eq("id", eventId);

  if (updateError) {
    log.error("failed to update minted count", {
      eventId,
      error: updateError.message,
    });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  log.info("sale recorded successfully", {
    eventId,
    ticketMint: body.ticketMint,
  });

  return NextResponse.json({ data: { ok: true } });
}
