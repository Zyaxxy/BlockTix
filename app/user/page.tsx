"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

export default function UserDashboard() {
  const { user, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const uid = user.userId;

    const checkRole = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("uid", uid)
          .single();

        if (!data) {
          const { data, error } = await supabase.from("users").insert({ uid, role: "user" });

if (error) {
  console.error("Supabase insert failed:", error);
} else {
  console.log("Inserted successfully:", data);
}
        } else if (data.role !== "user") {
          alert("Access denied: not a user");
          await handleLogOut?.();
          router.replace("/login/user");
          return;
        }

        setReady(true);
      } catch {
        router.replace("/login/user");
      }
    };

    checkRole();
  }, [isLoggedIn, user, handleLogOut, router]);

  if (!ready) return null;

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl">User Dashboard</h1>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
            Logout
          </button>
        </div>
        <div>Welcome — user content goes here.</div>
      </div>
    </div>
  );
}