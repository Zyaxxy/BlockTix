"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

export default function UserLogin() {
  const { user, handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const uid = user.userId; // Dynamic userId

    const checkUserRole = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("uid", uid)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase select error:", error);
        return;
      }

      if (!data) {
        // Insert first-time user
        const { data: newData, error: insertError } = await supabase
          .from("users")
          .insert({ uid, role: "user" });

        if (insertError) {
          console.error("Supabase insert failed:", insertError);
        } else {
          console.log("Inserted new user:", newData);
        }
      } else if (data.role !== "user") {
        alert("This wallet/user is registered as organizer");
        if (handleLogOut) await handleLogOut();
        return;
      }

      router.push("/user");
    };

    checkUserRole();
  }, [user, router, handleLogOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl">
        <h1 className="text-2xl mb-4">User Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}