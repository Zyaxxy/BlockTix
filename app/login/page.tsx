"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function LoginPage() {
  const { user } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      if (!user) return;

      console.log("Dynamic user:", user);

      const uid = user.userId;
      const email = user.email;

      if (!uid || !email) {
        console.log("Waiting for full user data...");
        return;
      }

      const res = await fetch("/api/check-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      const data = await res.json();

      if (data.exists) {
        router.push("/home");
      } else {
        router.push("/onboarding");
      }
    };

    checkUser();
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl text-center">
        <h1 className="text-2xl mb-4">Login to Block-Tix</h1>
        <DynamicWidget />
      </div>
    </div>
  );
}