"use client";

import { useEffect, useState } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";
import Router from "next/router";

export default function OrganizerDashboard() {
  const { user, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = Router;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login/organizer");
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
        router.replace("/login/organizer");
        return;
      }

      if (data.role !== "organizer") {
        router.replace("/user");
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
      <h1 className="text-2xl mb-4">Organizer Dashboard</h1>
      <button
        onClick={onLogout}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}