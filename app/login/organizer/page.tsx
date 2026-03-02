"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DynamicWidget,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";

export default function OrganizerLogin() {
  const { user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();

  useEffect(() => {
    // Only redirect AFTER authentication is complete
    if (!isLoggedIn || !user) return;

    console.log("Authenticated user:", user);

    // Since this is organizer login page
    router.push("/organizer");

  }, [isLoggedIn, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl">
        <h1 className="text-2xl mb-4">Organizer Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}