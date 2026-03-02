"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

export default function OrganizerLogin() {
  const { user, handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const uid = user.userId;

    const checkOrganizerRole = async () => {
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
        const { data: newData, error: insertError } = await supabase
          .from("users")
          .insert({ uid, role: "organizer" });

        if (insertError) console.error("Supabase insert failed:", insertError);
        else console.log("Inserted new organizer:", newData);
      } else if (data.role !== "organizer") {
        alert("This user is registered as user");
        if (handleLogOut) await handleLogOut();
        return;
      }

      router.push("/organizer");
    };

    checkOrganizerRole();
  }, [user, router, handleLogOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl">
        <h1 className="text-2xl mb-4">Organizer Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}