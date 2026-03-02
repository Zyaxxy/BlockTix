"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DynamicWidget,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";

export default function UserLogin() {
  const { user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    console.log("Authenticated user:", user);

    router.push("/user");
  }, [isLoggedIn, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl">
        <h1 className="text-2xl mb-4">User Login</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}