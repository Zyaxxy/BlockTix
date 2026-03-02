"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

// Ensure only wallets with role 'user' can access this page

export default function UserDashboard() {
  const { user, handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Give Dynamic a short moment to initialize the `user` value
    if (!user) {
      timer = setTimeout(() => {
        if (!user) router.push("/login/user");
      }, 600);
      return () => timer && clearTimeout(timer);
    }

    const walletAddress = user?.verifiedCredentials?.[0]?.address;
    if (!walletAddress) {
      router.push("/login/user");
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("wallet_address", walletAddress)
        .single();

      if (!data) {
        await supabase.from("users").insert([
          { wallet_address: walletAddress, role: "user" },
        ]);
        return;
      }

      if (data.role !== "user") {
        alert("Access denied: this wallet is not a user");
        if (handleLogOut) await handleLogOut();
        router.push("/login/user");
      }
    };

    checkRole();
  }, [user, router]);

  if (!user) return null;

  const onLogout = async () => {
    if (handleLogOut) await handleLogOut();
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