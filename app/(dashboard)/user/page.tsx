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
    if (!isLoggedIn) {
      router.replace("/login/user");
      return;
    }

    const uid = user?.userId;
    if (!uid) return;

    const checkRole = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("uid", uid)
        .single();

      if (error || !data) {
        router.replace("/login/user");
        return;
      }

      if (data.role !== "user") {
        router.replace("/organizer");
        return;
      }

      setReady(true);
    };

    checkRole();
  }, [isLoggedIn, user, router]);

  if (!ready) return null;

  const onLogout = async () => {
    await handleLogOut?.();
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-6 bg-black text-white">
      <h1 className="text-2xl mb-4">User Dashboard</h1>
      <button
        onClick={onLogout}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}