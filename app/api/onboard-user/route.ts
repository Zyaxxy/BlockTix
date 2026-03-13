import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("API received payload:", body);

    const { 
      wallet_address, 
      email, 
      firstName, 
      lastName, 
      interests, 
      location, 
      bio 
    } = body;

    // Safety check: Don't let empty wallets hit the DB
    if (!wallet_address) {
      return NextResponse.json({ error: "wallet_address is missing" }, { status: 400 });
    }

    const { error } = await supabase.from("users").insert([
      {
        wallet_address,
        email,
        first_name: firstName,
        last_name: lastName,
        interests,
        location,
        bio,
      },
    ]);

    if (error) {
      console.error("Supabase Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}