import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is missing" },
        { status: 400 }
      );
    }

    // Check if a user exists with this specific wallet_address
    const { data, error } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!data, // Returns true if user exists, false otherwise
    });
  } catch (err: any) {
    console.error("Route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}