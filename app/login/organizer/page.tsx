"use client";

import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BackgroundShader from "@/app/components/ui/landing/BackgroundShader";

export default function OrganizerLogin() {
  const { user } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (!user?.userId) return;

    const setRoleAndRedirect = async () => {
      const uid = user.userId;

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("uid", uid)
        .single();

      if (data?.role === "user") {
        router.replace("/user");
        return;
      }

      await supabase
        .from("users")
        .upsert({ uid, role: "organizer" }, { onConflict: "uid" });

      router.replace("/organizer");
    };

    setRoleAndRedirect();
  }, [user, router]);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundShader />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-4">
        <motion.div
          className="liquid-glass-strong w-full max-w-md rounded-3xl p-8 md:p-10"
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <h1 className="font-display italic text-4xl tracking-tight text-white text-shadow-soft">
              SOLTix
            </h1>
            <p className="text-sm text-white/50 mt-2 font-light">
              Organizer access
            </p>
          </div>

          <div className="glass-dynamic-widget">
            <DynamicWidget />
          </div>
        </motion.div>
      </div>
    </div>
  );
}