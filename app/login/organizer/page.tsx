"use client";

import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrganizerLogin() {
  const { user } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/organizer");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-8 bg-zinc-900 rounded-xl">
        <h1 className="text-2xl mb-4">Organizer Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}