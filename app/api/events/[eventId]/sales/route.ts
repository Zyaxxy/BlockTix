import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  const { eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as RecordSaleRequest | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.dynamicUserId || !body.candyMachineId || !body.buyerWallet || !body.ticketMint) {
    return NextResponse.json({ error: "Missing required sale fields." }, { status: 400 });
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
    .select("uid")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow) {
    return NextResponse.json({ error: "Unknown Dynamic user." }, { status: 403 });
  }

  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, candy_machine_id, minted_count, total_supply")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (eventRow.candy_machine_id !== body.candyMachineId) {
    return NextResponse.json({ error: "Candy machine does not match event." }, { status: 400 });
  }

  const mintedCount = Number(eventRow.minted_count ?? 0);
  const totalSupply = Number(eventRow.total_supply ?? 0);

  if (totalSupply > 0 && mintedCount >= totalSupply) {
    return NextResponse.json({ error: "Event is sold out." }, { status: 409 });
  }

  const { error: saleError } = await supabaseAdmin.from("ticket_sales").insert({
    event_id: eventId,
    candy_machine_id: body.candyMachineId,
    buyer_wallet: body.buyerWallet,
    ticket_mint: body.ticketMint,
    price_lamports: Math.floor(body.priceLamports),
  });

  if (saleError) {
    return NextResponse.json({ error: saleError.message }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({ minted_count: mintedCount + 1 })
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}
