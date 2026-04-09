"use client";

import {
  DynamicWidget,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import ProfileForm from "./ProfileForm";
import BackgroundShader from "../landing/BackgroundShader";

export default function LoginPage() {
  const { user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<"auth" | "profile">("auth");

  useEffect(() => {
    if (!isLoggedIn || !user?.userId) return;

    const handlePostAuth = async () => {
      const uid = user.userId;

      const { data } = await supabase
        .from("users")
        .select("role, name")
        .eq("uid", uid)
        .single();

      if (data?.role === "organizer") {
        router.replace("/organizer");
        return;
      }

      if (data?.name) {
        await supabase
          .from("users")
          .upsert({ uid, role: "user" }, { onConflict: "uid" });
        router.replace("/user");
        return;
      }

      setAuthStep("profile");
    };

    handlePostAuth();
  }, [isLoggedIn, user, router]);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundShader />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {authStep === "auth" ? (
            <motion.div
              key="auth"
              className="liquid-glass-strong w-full max-w-md rounded-3xl p-8 md:p-10"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="text-center mb-8">
                <h1 className="font-display italic text-4xl tracking-tight text-white text-shadow-soft">
                  SOLTix
                </h1>
                <p className="text-sm text-white/50 mt-2 font-light">
                  Your access, on-chain
                </p>
              </div>

              <div className="glass-dynamic-widget">
                <DynamicWidget />
              </div>
            </motion.div>
          ) : (
            <ProfileForm
              key="profile"
              userId={user?.userId ?? ""}
              onComplete={() => router.replace("/user")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}