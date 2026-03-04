import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const {
    uid,
    email,
    firstName,
    lastName,
    interests,
    location,
    bio,
  } = await req.json();

  const { error } = await supabase.from("users").insert([
    {
      uid,
      email,
      first_name: firstName,
      last_name: lastName,
      interests,
      location: location,
      bio,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}