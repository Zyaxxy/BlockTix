"use client";

import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OrganizerLogin() {
  const { user } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (!user?.userId) return;

    const setRoleAndRedirect = async () => {
      const uid = user.userId;

      // Check if user already exists with a role
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("uid", uid)
        .single();

      if (data?.role === "user") {
        // Already a user — send them to user dashboard
        router.replace("/user");
        return;
      }

      await supabase
        .from("users")
        .upsert({ uid, role: "organizer" }, { onConflict: "uid" });

      router.replace("/organizer");
    };

    setRoleAndRedirect();
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-8 bg-zinc-900 rounded-xl">
        <h1 className="text-2xl mb-4">Organizer Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}