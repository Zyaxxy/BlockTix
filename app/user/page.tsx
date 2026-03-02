"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

export default function UserDashboard() {
  const { user, primaryWallet, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();

  useEffect(() => {
    // 🔹 Step 1: Wait for authentication
    if (!isLoggedIn) {
      router.push("/login/user");
      return;
    }

    if (!primaryWallet) return;

    const checkRole = async () => {
      const walletAddress = primaryWallet.address.toLowerCase();

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("wallet_address", walletAddress)
        .single();

      if (error) {
        console.error("Role check error:", error);
        return;
      }

      // First-time user → auto-create
      if (!data) {
        await supabase.from("users").insert({
          wallet_address: walletAddress,
          role: "user",
        });
        return;
      }

      // Wrong role → logout
      if (data.role !== "user") {
        alert("Access denied: this wallet is not registered as user.");
        await handleLogOut();
        router.push("/login/user");
      }
    };

    checkRole();
  }, [isLoggedIn, primaryWallet, router, handleLogOut]);

  if (!isLoggedIn || !user) return null;

  const onLogout = async () => {
    await handleLogOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl">User Dashboard</h1>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>

        <div>Welcome — user content goes here.</div>
      </div>
    </div>
  );
}