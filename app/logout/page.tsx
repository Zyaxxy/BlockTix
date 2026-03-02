"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function LogoutPage() {
  const { handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    const doLogout = async () => {
      try {
        if (handleLogOut) await handleLogOut();
      } catch (e) {
        console.error("Logout error", e);
      } finally {
        router.push("/");
      }
    };

    doLogout();
  }, [handleLogOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl">Logging out…</div>
    </div>
  );
}
