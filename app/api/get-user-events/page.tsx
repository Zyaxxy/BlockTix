import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    // 1. Get the wallet address associated with this UID from your users table
    const { data: userProfile } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("uid", uid)
      .single();

    if (!userProfile?.wallet_address) {
      return NextResponse.json({ events: [] });
    }

    // 2. Fetch events from your DB
    // Since you already saved the collection_address during the Create flow, 
    // you don't *have* to re-fetch from the blockchain here unless you need real-time supply counts.
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("creator_address", userProfile.wallet_address);

    if (error) throw error;

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}