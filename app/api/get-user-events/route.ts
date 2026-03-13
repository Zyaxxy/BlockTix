import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    const { wallet_address } = await req.json();

    // 1. Get the wallet address associated with this UID from your users table
    const { data: userProfile } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("wallet_address", wallet_address)
      .single();

    if (!userProfile?.wallet_address) {
      return NextResponse.json({ events: [] });
    }

    // 2. Fetch events from your DB
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_wallet", wallet_address);

    if (error) throw error;

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}