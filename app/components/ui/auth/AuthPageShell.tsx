"use client";

import {
  DynamicEmbeddedAuthFlow,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile, persistUserProfile } from "@/lib/profile";
import BackgroundShader from "../landing/BackgroundShader";
import ProfileForm from "./ProfileForm";

type AuthPageShellProps = {
  role: "user" | "organizer";
  redirectPath: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  mobileTitle: string;
  mobileSubtitle: string;
};

export default function AuthPageShell({
  role,
  redirectPath,
  sidebarTitle,
  sidebarSubtitle,
  mobileTitle,
  mobileSubtitle,
}: AuthPageShellProps) {
  const { user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<"auth" | "profile">("auth");

  useEffect(() => {
    if (!isLoggedIn || !user?.userId) return;

    const handlePostAuth = async () => {
      try {
        const uid = user.userId!;
        const data = await fetchUserProfile(uid);

        if (data?.role && data.role !== role) {
          router.replace(data.role === "organizer" ? "/organizer" : "/user");
          return;
        }

        if (data?.name) {
          await persistUserProfile({
            uid,
            role,
            name: data.name,
            avatarUrl: data.avatarUrl ?? undefined,
          });
          router.replace(redirectPath);
          return;
        }

        setAuthStep("profile");
      } catch {
        setAuthStep("auth");
      }
    };

    handlePostAuth();
  }, [isLoggedIn, user, router, role, redirectPath]);

  return (
    <div className="fixed inset-0 min-h-screen overflow-hidden bg-black text-white">
      <BackgroundShader />

      <div className="fixed inset-0 z-50 pointer-events-none overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-6 md:px-8 md:py-10">
          <AnimatePresence mode="wait">
            {authStep === "auth" ? (
              <motion.section
                key="auth"
                className="liquid-glass-strong pointer-events-auto w-full max-w-5xl rounded-[2rem] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-4 md:p-6"
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="grid items-stretch gap-3 md:grid-cols-[minmax(240px,0.8fr)_minmax(360px,1.2fr)] md:gap-6">
                  <aside className="liquid-glass hidden flex-col justify-between rounded-3xl p-6 md:flex md:p-8">
                    <div>
                      <h1 className="font-display italic text-5xl tracking-tight text-white text-shadow-soft">
                        BlockTix
                      </h1>
                      <p className="mt-2 text-sm font-light text-white/65">{sidebarTitle}</p>
                    </div>

                    <p className="max-w-[24ch] text-xs font-light leading-relaxed text-white/45">
                      {sidebarSubtitle}
                    </p>
                  </aside>

                  <div className="liquid-glass rounded-3xl p-3 sm:p-4 md:p-5">
                    <div className="mb-3 text-center md:mb-4 md:hidden">
                      <h1 className="font-display italic text-4xl tracking-tight text-white text-shadow-soft">
                        {mobileTitle}
                      </h1>
                      <p className="mt-1.5 text-sm font-light text-white/55">{mobileSubtitle}</p>
                    </div>

                    <div className="max-h-[82vh] min-h-[380px] overflow-hidden overflow-y-auto rounded-2xl md:max-h-none md:overflow-visible">
                      <DynamicEmbeddedAuthFlow key="embedded-auth" />
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              <ProfileForm
                key="profile"
                userId={user?.userId ?? ""}
                role={role}
                onComplete={() => router.replace(redirectPath)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}