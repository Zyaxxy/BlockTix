"use client";

import {
  DynamicEmbeddedAuthFlow,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import ProfileForm from "./ProfileForm";
import BackgroundShader from "../landing/BackgroundShader";

export default function OrganizerLoginPage() {
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

      if (data?.role === "user") {
        router.replace("/user");
        return;
      }

      if (data?.name) {
        await supabase
          .from("users")
          .upsert({ uid, role: "organizer" }, { onConflict: "uid" });
        router.replace("/organizer");
        return;
      }

      setAuthStep("profile");
    };

    handlePostAuth();
  }, [isLoggedIn, user, router]);

  return (
    <div className="fixed inset-0 min-h-screen bg-black text-white overflow-hidden">
      <BackgroundShader />

      <div className="fixed inset-0 z-50 pointer-events-none overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-6 md:px-8 md:py-10">
          <AnimatePresence mode="wait">
            {authStep === "auth" ? (
              <motion.section
                key="auth"
                className="liquid-glass-strong pointer-events-auto w-full max-w-5xl rounded-[2rem] p-3 sm:p-4 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="grid items-stretch gap-3 md:gap-6 md:grid-cols-[minmax(240px,0.8fr)_minmax(360px,1.2fr)]">
                  <aside className="liquid-glass rounded-3xl p-6 md:p-8 hidden md:flex flex-col justify-between">
                    <div>
                      <h1 className="font-display italic text-5xl tracking-tight text-white text-shadow-soft">
                        BlockTix
                      </h1>
                      <p className="text-white/65 mt-2 text-sm font-light">
                        Organizer access, on-chain
                      </p>
                    </div>

                    <p className="text-xs text-white/45 font-light leading-relaxed max-w-[24ch]">
                      Connect to create, manage, and launch on-chain events with verifiable tickets.
                    </p>
                  </aside>

                  <div className="liquid-glass rounded-3xl p-3 sm:p-4 md:p-5">
                    <div className="text-center mb-3 md:mb-4 md:hidden">
                      <h1 className="font-display italic text-4xl tracking-tight text-white text-shadow-soft">
                        BlockTix
                      </h1>
                      <p className="text-sm text-white/55 mt-1.5 font-light">
                        Organizer access, on-chain
                      </p>
                    </div>

                    <div className="rounded-2xl overflow-hidden min-h-[380px] md:min-h-[460px] max-h-[82vh] md:max-h-none overflow-y-auto md:overflow-visible">
                      <DynamicEmbeddedAuthFlow key="embedded-auth" />
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              <ProfileForm
                key="profile"
                userId={user?.userId ?? ""}
                onComplete={async () => {
                  await supabase
                    .from("users")
                    .upsert({ uid: user?.userId, role: "organizer" }, { onConflict: "uid" });
                  router.replace("/organizer");
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}