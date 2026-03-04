import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { error: "UID missing" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("uid")
      .eq("uid", uid)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!data,
    });
  } catch (err: any) {
    console.error("Route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}