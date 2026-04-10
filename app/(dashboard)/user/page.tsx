"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { fetchUserProfile } from "@/lib/profile";

export default function UserDashboard() {
  const { user, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const uid = user?.userId;
    if (!uid) return;

    const checkRole = async () => {
      const data = await fetchUserProfile(uid);

      if (!data) {
        router.replace("/login");
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
        className="liquid-glass-strong text-shadow-soft inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition hover:opacity-80"
      >
        Logout
      </button>
    </div>
  );
}