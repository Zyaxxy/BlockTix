"use client";

import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UserLogin() {
  const { user } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (!user?.userId) return;

    const setRoleAndRedirect = async () => {
      const uid = user.userId;

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("uid", uid)
        .single();

      if (data?.role === "organizer") {
        router.replace("/organizer");
        return;
      }

      await supabase
        .from("users")
        .upsert({ uid, role: "user" }, { onConflict: "uid" });

      router.replace("/user");
    };

    setRoleAndRedirect();
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-8 bg-zinc-900 rounded-xl">
        <h1 className="text-2xl mb-4">User Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}