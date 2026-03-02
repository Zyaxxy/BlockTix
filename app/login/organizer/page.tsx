"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DynamicWidget,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

export default function OrganizerLogin() {
  const { user, handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    const walletAddress =
      user?.verifiedCredentials?.[0]?.address;

    if (!walletAddress) return;

    const checkOrganizerRole = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      console.debug("checkOrganizerRole result", { walletAddress, data, error });
      if (error) {
        console.error("Supabase error checking organizer role", error);
        return;
      }

      // 🟢 First time → create organizer record
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              wallet_address: walletAddress,
              role: "organizer",
            },
          ]);
        console.debug("inserted new organizer", { newData, insertError });

        router.push("/organizer");
        return;
      }

      // 🔴 Wallet exists but wrong role
      if (data.role !== "organizer") {
        alert("This wallet is registered as user");
        await handleLogOut();
        return;
      }

      // ✅ Correct role
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