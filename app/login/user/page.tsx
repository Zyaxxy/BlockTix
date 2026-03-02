"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DynamicWidget,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase";

export default function UserLogin() {
  const { user, handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    const walletAddress =
      user?.verifiedCredentials?.[0]?.address;

    if (!walletAddress) return;

    const checkUserRole = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      console.debug("checkUserRole result", { walletAddress, data, error });

      if (error) {
        // If there's a Supabase error, log it and bail; user will stay on login
        console.error("Supabase error checking user role", error);
        return;
      }

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              wallet_address: walletAddress,
              role: "user",
            },
          ]);
        console.debug("inserted new user", { newData, insertError });
        router.push("/user");
        return;
      }

      if (data.role !== "user") {
        alert("This wallet is registered as organizer");
        await handleLogOut();
        return;
      }

      router.push("/user");
    };

    checkUserRole();
  }, [user, router, handleLogOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl">
        <h1 className="text-2xl mb-4">User Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}
